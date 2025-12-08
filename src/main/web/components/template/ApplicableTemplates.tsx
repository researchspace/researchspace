import * as React from 'react';
import * as _ from 'lodash';
import { ButtonToolbar, ButtonGroup } from 'react-bootstrap';
import { Rdf, vocabularies } from 'platform/api/rdf';
import { PageService, TemplateInfo } from 'platform/api/services/page';
import { ResourceLink, ResourceLinkAction } from 'platform/api/navigation/components';

const P2_HAS_TYPE = 'http://www.cidoc-crm.org/cidoc-crm/P2_has_type';

export interface ApplicableTemplatesProps {
  rdfType?: Rdf.Iri;
  hasType?: Rdf.Iri;
}

export const ApplicableTemplates: React.FC<ApplicableTemplatesProps> = (props) => {
  const [applicableTemplates, setApplicableTemplates] = React.useState<string[]>([]);
  const [appliedTemplate, setAppliedTemplate] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    // 1. Identify types from props
    const types: string[] = [];
    
    if (props.rdfType) { console.log("here"+props.rdfType.toString());
      types.push(props.rdfType.toString());
    }
    
    if (props.hasType) {
      types.push(props.hasType.toString());
    }

    // 2. Generate candidate template identifiers
    const candidates = new Set<string>();
    
    // Add Template:<Type> for each type
    types.forEach(type => {
      candidates.add('Template:' + type);console.log("Template:"+type);
    });

    // Add default template
    candidates.add('Template:' + vocabularies.rdfs.Resource.value);

    // 3. Fetch all existing templates and filter candidates
    PageService.getAllTemplateInfos().onValue((templateInfos: TemplateInfo[]) => {
      const existingTemplatesSet = new Set(templateInfos.map(t => t.iri));
      
      const validTemplates = Array.from(candidates).filter(candidate => existingTemplatesSet.has(candidate));
      
      setApplicableTemplates(validTemplates);
      
      // Determine applied template (simplified logic: take the first one that exists)
      if (validTemplates.length > 0) {
        setAppliedTemplate(validTemplates[0]);
      }
    });

  }, [props.rdfType, props.hasType]);

  if (applicableTemplates.length === 0) {
    return null;
  }

  return (
    <ButtonToolbar>
      <ButtonGroup>Applicable Templates:</ButtonGroup>
      {applicableTemplates.map((res) => {
        const style = appliedTemplate === res ? { backgroundColor: '#FFC857' } : {};
        const title = appliedTemplate === res ? 'This template would be applied.' : undefined;
        return (
          <ButtonGroup key={res} style={style} title={title}>
            
<ResourceLink resource={Rdf.iri(res)} draggable={false} target='_blank' action={ResourceLinkAction.edit}>
              
           
            {res}
          </ResourceLink>
          </ButtonGroup>
        );
      })}
    </ButtonToolbar>
  );
};

export default ApplicableTemplates;
