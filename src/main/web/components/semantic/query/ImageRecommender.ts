import * as React from 'react';
import axios from 'axios';
import { createElement, ReactNode, ReactElement, Props } from 'react';
import { Alert, AlertConfig, AlertType } from 'platform/components/ui/alert';
import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';
import { ErrorNotification } from 'platform/components/ui/notification';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { Component, ComponentProps, ComponentContext } from 'platform/api/components';
import * as componentMappings from '../../../../../../components.json';
import * as _ from 'lodash';
import * as maybe from 'data.maybe';

interface ImageRecommenderConfig{
    title: string;
    children: (data: any) => ReactNode; 
    
    /**
     * <semantic-link uri='http://help.researchspace.org/resource/FrontendTemplating'>Template</semantic-link>, that gets a <a target='_blank' href='https://www.w3.org/TR/sparql11-results-json/#select-results'>bindings</a> object injected as template context i.e. the result binding to iterate over. [each helper](http://handlebarsjs.com/builtin_helpers.html#iteration) can be used to iterate over the bindings.
     * The template will only be rendered if and only if the result is not empty, so that one does not need to have additional if expressions around the component in order to hide it, for example, a list header if actually no result are to be displayed.
     * **Example:** `My Result: {{#each bindings}}{{bindingName.value}}{{/each}}` .
     * **Default:** If no template is provided, all tuples for the first projection variable will we rendered as a comma-separated list.
     */
    template?: string;

    /**
     * <semantic-link uri='http://help.researchspace.org/resource/FrontendTemplating'>Template</semantic-link> which is applied when query returns no results.
     */
   noResultTemplate?: string;

    /**
     * CSS classes for component holder element.
     */
    className?: string;

    /**
     * CSS styles for component holder element.
     */
    style?: string;
}

interface ImageRecommederState {
    result?: Data.Maybe<SparqlClient.SparqlSelectResult>;
    query?: string;
    alertState?: AlertConfig;
    progress?: number;
    isLoading?: boolean;
    error?: any;
}

const FLASK_BASE_URL = "http://localhost:5004/";

export type ImageRecommenderProps =  ImageRecommenderConfig & Props<ImageRecommender> & ComponentProps;

class ImageRecommender extends Component<ImageRecommenderProps, ImageRecommederState> {


    constructor(props: ImageRecommenderConfig, context: ComponentContext) {
        super(props, context);
        this.state = {
            query: "",
            alertState: undefined,
            progress: undefined,
            isLoading: true,
            result: maybe.Nothing<SparqlClient.SparqlSelectResult>(),
        };
    }

    public shouldComponentUpdate(nextProps: ImageRecommenderProps, nextState: ImageRecommederState) {
        return nextState.isLoading !== this.state.isLoading || !_.isEqual(nextProps, this.props);
      }

    componentDidMount() {
        this.getRecommendedImages();
    }

    //Post request to flask server
    getRecommendedImages(){
        this.setState({ isLoading: true, error: undefined });
        console.log("Made request")
        const requestPayload = {
            title: this.props.title
        };

        axios.post(FLASK_BASE_URL + 'recommend_images', requestPayload)
        .then((response) => {
            console.log(response.status)
            this.setState({
                alertState: {
                    alert: AlertType.SUCCESS,
                    message:
                    `Received recommended files.`
                },
                progress: null,
                query: response.data,
                isLoading: false,
                result: maybe.Just(response.data),
            });
            console.log('GenerateRDF Response: ', response.data);
        })
        .catch((error) => {
            console.error('Error Occurred while generating RDF', error);
            this.setState({error, isLoading: false});
        });
    }

      public render() {
        if (this.state.isLoading) {
          return createElement(Spinner);
        } else if (this.state.error) {
          return createElement(ErrorNotification, { errorMessage: this.state.error });
        } else {
          return this.state.result.map(this.renderResult(this.props.template)).getOrElse(null);
        }
      }

        /**
     * Returns a ReactElement by compiling the (optional) handlebars.js templateString
     * (or using a defaultTemplate otherwise). The bindings from the SparqlSelectResult
     * will be passed into the template as context.
     */
    private renderResult = (templateString?: string) => (res: SparqlClient.SparqlSelectResult): ReactElement<any> => {
        
        console.log("temp str" + templateString);
        
        if (SparqlUtil.isSelectResultEmpty(res)) {
            console.log("res empty");
        return createElement(TemplateItem, { template: { source: this.getNoResultTemplateString() } });
        }

        const firstBindingVar = res.head.vars[0];
        console.log("res: "+JSON.stringify(res.results,null,2));
        return createElement(TemplateItem, {
        template: {
            source: this.getTemplateString(templateString, firstBindingVar),
            options: res.results,
        },
        componentProps: {
            style: this.props.style,
            className: this.props.className,
        },
        });
    };

    /**
     * Returns a default handlbars.js template string to render the first binding
     * of a SPARQL Select result into a (default) list if no custom template
     * is specified by the user.
     *
     * @param res SparqlSelectResult to extract the first binding variable from
     * @returns {string}
     */
    private getTemplateString = (template: string, bindingVar: string): string => {
        console.log("in getTemplateString");
        if (template) {
            console.log("here "+template);
            return template;
        }

        console.log(template);
        console.log(bindingVar);
        // try to get default "<template>" element with id template from the local scope
        const localScope = this.props.markupTemplateScope;
        const partial = localScope ? localScope.getPartial('template') : undefined;
        if (partial) {
            console.log("partial" + JSON.stringify(partial, null, 2));
            return partial.source;
        }

        return (
        '<div>{{#each bindings}}' +
        // '{{#if (isIri ' +
        // bindingVar +
        // ')}}' +
        // '<semantic-link uri="{{' +
        // bindingVar +
        // '.value}}"></semantic-link>' +
        // '{{else}}' +
        '{{' +
        bindingVar +
        '.value}}' +
        // '{{/if}}' +
        '{{#if @last}}{{else}},&nbsp;{{/if}}' +
        '{{/each}}</div>'
        );
    };

    private getNoResultTemplateString = (): string => {
        if (this.props.noResultTemplate) {
        return this.props.noResultTemplate;
        }

        // try to get default noResultTemplate "<template>" element with id template from the local scope
        const localScope = this.props.markupTemplateScope;
        const partial = localScope ? localScope.getPartial('noResultTemplate') : undefined;
        if (partial) {
        return partial.source;
        } else {
        return '';
        }
    }

}

export default ImageRecommender;
