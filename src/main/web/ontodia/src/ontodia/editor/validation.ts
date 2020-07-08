import { isEmpty } from 'lodash';

import { ElementIri, LinkModel, hashLink, sameLink } from '../data/model';
import { ValidationApi, ValidationEvent, ElementError, LinkError } from '../data/validationApi';
import { CancellationToken } from '../viewUtils/async';
import { HashMap, ReadonlyHashMap, cloneMap } from '../viewUtils/collections';
import { AuthoringState } from './authoringState';
import { EditorController } from './editorController';

export interface ValidationState {
  readonly elements: ReadonlyMap<ElementIri, ElementValidation>;
  readonly links: ReadonlyHashMap<LinkModel, LinkValidation>;
  readonly isValid: boolean;
}

interface MutableValidationState {
  elements: Map<ElementIri, ElementValidation>;
  links: HashMap<LinkModel, LinkValidation>;
  isValid: boolean;
}

export interface ElementValidation {
  readonly loading: boolean;
  readonly errors: ReadonlyArray<ElementError>;
}

export interface LinkValidation {
  readonly loading: boolean;
  readonly errors: ReadonlyArray<LinkError>;
}

export namespace ValidationState {
  export const empty: ValidationState = createMutable();
  export const emptyElement: ElementValidation = { loading: false, errors: [] };
  export const emptyLink: LinkValidation = { loading: false, errors: [] };

  export function createMutable(): MutableValidationState {
    return {
      elements: new Map<ElementIri, ElementValidation>(),
      links: new HashMap<LinkModel, LinkValidation>(hashLink, sameLink),
      isValid: true,
    };
  }
}

export function changedElementsToValidate(previousAuthoring: AuthoringState, editor: EditorController) {
  const currentAuthoring = editor.authoringState;

  const links = new HashMap<LinkModel, true>(hashLink, sameLink);
  previousAuthoring.links.forEach((e, model) => links.set(model, true));
  currentAuthoring.links.forEach((e, model) => links.set(model, true));

  const toValidate = new Set<ElementIri>();
  links.forEach((value, linkModel) => {
    const current = currentAuthoring.links.get(linkModel);
    const previous = previousAuthoring.links.get(linkModel);
    if (current !== previous) {
      toValidate.add(linkModel.sourceId);
    }
  });

  for (const element of editor.model.elements) {
    const current = currentAuthoring.elements.get(element.iri);
    const previous = previousAuthoring.elements.get(element.iri);
    if (current !== previous) {
      toValidate.add(element.iri);

      // when we remove element incoming link are removed as well so we should update their sources
      if ((current || previous).deleted) {
        for (const link of element.links) {
          if (link.data.sourceId !== element.iri) {
            toValidate.add(link.data.sourceId);
          }
        }
      }
    }
  }

  return toValidate;
}

export async function validateElements(
  targets: ReadonlySet<ElementIri>,
  validationApi: ValidationApi,
  editor: EditorController,
  cancellationToken: CancellationToken
) {
  const previousState = editor.validationState;
  let newState = ValidationState.createMutable();

  for (const element of editor.model.elements) {
    if (newState.elements.has(element.iri)) {
      continue;
    }

    const outboundLinks = element.links.reduce((acc: LinkModel[], link) => {
      if (link.sourceId === element.id) {
        acc.push(link.data);
      }
      return acc;
    }, []);

    if (targets.has(element.iri)) {
      const event: ValidationEvent = {
        target: element.data,
        outboundLinks,
        state: editor.authoringState,
        model: editor.model,
        cancellation: cancellationToken,
      };
      const result = CancellationToken.mapCancelledToNull(cancellationToken, validationApi.validate(event));

      const loadingElement: ElementValidation = { loading: true, errors: [] };
      const loadingLink: LinkValidation = { loading: true, errors: [] };
      newState.elements.set(element.iri, loadingElement);
      outboundLinks.forEach((link) => newState.links.set(link, loadingLink));

      newState = await processValidationResult(result, loadingElement, loadingLink, event, newState);
    } else {
      // use previous state for element and outbound links
      const previousElementState = previousState.elements.get(element.iri);
      newState.elements.set(element.iri, previousElementState);
      newState.isValid =
        newState.isValid && isEmpty(previousElementState?.errors)
      for (const link of outboundLinks) {
        const previousLinkState = previousState.links.get(link);
        newState.isValid =
          newState.isValid && isEmpty(previousLinkState?.errors)
        newState.links.set(link, previousLinkState);
      }
    }
  }

  editor.setValidationState(newState);
}

async function processValidationResult(
  result: Promise<Array<ElementError | LinkError> | null>,
  previousElement: ElementValidation,
  previousLink: LinkValidation,
  e: ValidationEvent,
  state: MutableValidationState
): Promise<MutableValidationState> {
  let allErrors: Array<ElementError | LinkError> | null;
  try {
    allErrors = await result;
    if (allErrors === null) {
      // validation was cancelled
      return;
    }
  } catch (err) {
    // tslint:disable-next-line:no-console
    console.error(`Failed to validate element`, e.target, err);
    allErrors = [{ type: 'element', target: e.target.id, message: `Failed to validate element` }];
  }

  const elementErrors: ElementError[] = [];
  const linkErrors = new HashMap<LinkModel, LinkError[]>(hashLink, sameLink);
  e.outboundLinks.forEach((link) => linkErrors.set(link, []));

  for (const error of allErrors) {
    if (error.type === 'element' && error.target === e.target.id) {
      elementErrors.push(error);
    } else if (error.type === 'link' && linkErrors.has(error.target)) {
      linkErrors.get(error.target).push(error);
    }
  }

  if (state.elements.get(e.target.id) === previousElement) {
    if (elementErrors.length > 0) {
      state.elements.set(e.target.id, { loading: false, errors: elementErrors });
    } else {
      state.elements.delete(e.target.id);
    }
  }
  linkErrors.forEach((errors, link) => {
    if (state.links.get(link) === previousLink) {
      if (errors.length > 0) {
        state.links.set(link, { loading: false, errors });
      } else {
        state.links.delete(link);
      }
    }
  });
  state.isValid = state.isValid && isEmpty(allErrors);

  return state;
}
