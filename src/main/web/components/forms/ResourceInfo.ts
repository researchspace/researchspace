
import { createElement } from 'react';

import { Component } from "platform/api/components";
import { getCurrentResource } from 'platform/api/navigation';
import { Spinner } from 'platform/components/ui/spinner';
import { getResourceInfo, getResourceInfoForKnowledgePatterns } from 'platform/api/services/resource-info';
import { Rdf } from 'platform/api/rdf';
import { TemplateItem } from 'platform/components/ui/template';
import { getPreferredUserLanguage } from 'platform/api/services/language';


export interface ResourceInfoConfig {
 /**
   * The IRI of the resource that needs to be visualized.
   */
  subject?: string;

  profile?: string;

  knowledgePatterns?: Array<string>;

  template: string;
}

interface State {
    data: {};
    isLoading: boolean;
    noData: boolean;
}

export class ResourceInfo extends Component<ResourceInfoConfig, State> {
    constructor(props, context) {
      super(props, context);
      this.state = {
        data: null,
        isLoading: true,
        noData: true,
      };
    }
  
    static defaultProps = {
      subject: getCurrentResource().value,
      additionalSubjects: []
    };
  
    public componentDidMount() {
      this.fetchResourceInfo();
    }
  
    render() {
      return this.state.isLoading ? createElement(Spinner) : this.renderResult();
    }

    private renderResult() {
        return createElement(TemplateItem, {
            template: {
              source: this.props.template,
              options: {
                subject: this.props.subject,
                data: this.state.data,
              },
            },
          });      
    }   

    private fetchResourceInfo() {
        const { subject, profile, knowledgePatterns } = this.props;
        const subjectIri = Rdf.iri(subject);
        const repository = this.context.semanticContext.repository;
        const defaultGraphs = this.context.semanticContext.defaultGraphs;

        if (profile) {
        getResourceInfo(subjectIri, profile, getPreferredUserLanguage(), repository, defaultGraphs).then((data) => {
            this.setState({
                data: data,
                isLoading: false,
                noData: false,
            });
        });
      } else if (knowledgePatterns) {
        getResourceInfoForKnowledgePatterns(
          subjectIri, knowledgePatterns.map(Rdf.iri), getPreferredUserLanguage(), repository, defaultGraphs
        ).then((data) => {
            this.setState({
                data: data,
                isLoading: false,
                noData: false,
            });
        });
      }
    }
}

export default ResourceInfo;
