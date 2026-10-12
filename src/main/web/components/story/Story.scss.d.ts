declare namespace StoryScssNamespace {
  export interface IStoryScss {
    activeDot: string;
    body: string;
    bottomLeft: string;
    bottomRight: string;
    collapsed: string;
    dot: string;
    dots: string;
    editor: string;
    editorActions: string;
    error: string;
    expandButton: string;
    floating: string;
    footer: string;
    header: string;
    iconButton: string;
    inline: string;
    middleLeft: string;
    middleRight: string;
    problems: string;
    progress: string;
    progressLabel: string;
    richText: string;
    slideCard: string;
    slideCardBody: string;
    slideCardHeading: string;
    slideFields: string;
    slidePreview: string;
    slidePreviewColumn: string;
    slideText: string;
    slideTitle: string;
    slidesHeading: string;
    story: string;
    storyIri: string;
    storyTitle: string;
    topLeft: string;
    topRight: string;
  }
}

declare const StoryScssModule: StoryScssNamespace.IStoryScss;

export = StoryScssModule;
