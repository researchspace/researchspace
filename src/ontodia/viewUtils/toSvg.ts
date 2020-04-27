import { uniqueId } from 'lodash';

import { DiagramModel } from '../diagram/model';
import { Rect, Vector, boundsOf } from '../diagram/geometry';

const SVG_NAMESPACE: 'http://www.w3.org/2000/svg' = 'http://www.w3.org/2000/svg';

export interface ToSVGOptions {
    model: DiagramModel;
    paper: SVGSVGElement;
    contentBox: Rect;
    getOverlayedElement: (id: string) => HTMLElement;
    preserveDimensions?: boolean;
    elementsToRemoveSelector?: string;
}

interface Bounds {
    width: number;
    height: number;
}

/**
 * Padding (in px) for <foreignObject> elements of exported SVG to
 * mitigate issues with elements body overflow caused by missing styles
 * in exported image.
 */
const FOREIGN_OBJECT_SIZE_PADDING = 2;
const BORDER_PADDING = 100;

export async function toSVG(options: ToSVGOptions): Promise<string> {
    const svg = await exportSVG(options);
    return new XMLSerializer().serializeToString(svg);
}

async function exportSVG(options: ToSVGOptions): Promise<SVGElement> {
    const {contentBox: bbox} = options;
    const {svgClone, imageBounds} = clonePaperSvg(options, FOREIGN_OBJECT_SIZE_PADDING);

    const paddedWidth = bbox.width + 2 * BORDER_PADDING;
    const paddedHeight = bbox.height + 2 * BORDER_PADDING;

    if (options.preserveDimensions) {
        svgClone.setAttribute('width', paddedWidth.toString());
        svgClone.setAttribute('height', paddedHeight.toString());
    } else {
        svgClone.setAttribute('width', '100%');
        svgClone.setAttribute('height', '100%');
    }

    const viewBox: Rect = {
        x: bbox.x - BORDER_PADDING,
        y: bbox.y - BORDER_PADDING,
        width: paddedWidth,
        height: paddedHeight,
    };
    svgClone.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);

    const images: HTMLImageElement[] = [];
    const nodes = svgClone.querySelectorAll('img');
    foreachNode(nodes, node => images.push(node));

    const convertingImages = Promise.all(images.map(async img => {
        const exportKey = img.getAttribute('export-key');
        img.removeAttribute('export-key');
        if (exportKey) {
            const {width, height} = imageBounds[exportKey];
            img.setAttribute('width', width.toString());
            img.setAttribute('height', height.toString());
            try {
                const dataUri = await exportImageAsDataUri(img);
                // check for empty svg data URI which happens when mockJointXHR catches an exception
                if (dataUri && dataUri !== 'data:image/svg+xml,') {
                    img.src = dataUri;
                }
            }
            catch (err) {
                // tslint:disable-next-line:no-console
                console.warn('Failed to export image: ' + img.src, err);
            }
        } else {
            return Promise.resolve();
        }
    }));

    await convertingImages;
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = await extractStylesheets();
    svgClone.insertBefore(defs, svgClone.firstChild);
    if (options.elementsToRemoveSelector) {
        foreachNode(svgClone.querySelectorAll(options.elementsToRemoveSelector), node => node.remove());
    }
    return svgClone;
}

async function extractStylesheets() {
    const styleSheets: String[] = [];
    // we extract all styles from current html document because there is no way to
    // reliably get only styles that are applicable to diagram elements.
    //
    // for more information about used DOM API see
    // https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet#Notes
    for (let i = 0; i < document.styleSheets.length; i++) {
        const styleSheet = document.styleSheets[i];
        const ownerNode = styleSheet.ownerNode;
        let styleText;

        // we remember url of the stylesheet because we then need to use it to resolve all
        // relative URLs inside the stylesheet
        let styleSheetURL;
        if (ownerNode instanceof HTMLLinkElement) {
            // if stylesheet is coming from <link> element then we need to get the content on our own
            const url = ownerNode.href;
            const request = new Request(url);
            // this will give us absolute URL of the stylesheet
            styleSheetURL = request.url;
            styleText =
                await fetch(request).then(
                    response => {
                        if (!response.ok) {
                            throw new Error(
                                `Ontodia was not able to fetch stylesheet: ${url}`
                            );
                        }
                        return response.text();
                    }
                );
        } else if (ownerNode instanceof HTMLStyleElement) {
            // if it is from <style> then we can just grab innerHTML
            styleText = ownerNode.innerHTML;
            // in case of <style> we assume that stylesheet URL is current document
            styleSheetURL = document.baseURI;
        } else {
            // We assume that all style-sheets in the document are coming from <style> or <link>,
            // currently there is no support for css @import rules.
            throw new Error('Current HTML document contains css stylesheet with @import rule, that is currently not supported by ontodia. See ontodia sources toSvg.ts#extractStylesheets');
        }

        styleSheets.push(
            await embedExternalResources(styleSheetURL, styleText)
        );
    }

    return `<style>${styleSheets.join('\n')}</style>`;
}

/**
 * Embeds all referenced resources in CSS as data urls.
 *
 * @param baseUrl - stylesheet URL for relative link resolution
 * @param styles - actual stylesheet text
 *
 * @returns stylesheet with url(*) resolved as embedded data-uris
 */
async function embedExternalResources(baseUrl: string, styles: string) {
    const extractFontUrlRegex = /url\((.*?)\)/gm;

    const fontUrls: Array<string> = [];
    let m;
    while ((m = extractFontUrlRegex.exec(styles)) !== null) {
        if (m.index === extractFontUrlRegex.lastIndex) {
            extractFontUrlRegex.lastIndex++;
        }

        // 0 is the whole match, 1 is the first matching group (in our case everything inside url())
        const urlStr = m[1];
        // if URL is data url then we don't need to do anything with it
        if (urlStr.startsWith('data:')) {
            // it is data-url so just ignore it;
        } else {
            fontUrls.push(urlStr);
        }
    }

    // fetch all fonts as data uri
    const fonts =
        await Promise.all(
            fontUrls.map(
                urlStr => {
                    // the urls that we extracted
                    let fontUrl = urlStr;

                    // URL can be represented in three ways:
                    //    <a_css_property>: url("http://mysite.example.com/mycursor.png")
                    //    <a_css_property>: url('http://mysite.example.com/mycursor.png')
                    //    <a_css_property>: url(http://mysite.example.com/mycursor.png)
                    //
                    // see https://developer.mozilla.org/en-US/docs/Web/CSS/url#Syntax
                    //
                    // so we need to strip quotes to get the actual URL
                    if (
                        (urlStr.startsWith('"') && urlStr.endsWith('"')) ||
                            (urlStr.startsWith("'") && urlStr.endsWith("'"))
                    ) {
                        // strip double or single quotes
                        fontUrl = urlStr.slice(1, -1);
                    }
                    return exportAsDataUri(new URL(fontUrl, baseUrl).href);
                }
            )
        );

    // replace all urls with data uris
    return fontUrls.reduce(
        (s, url, i) => s.replace(url, '"' + fonts[i] + '"'), styles
    );
}

function clonePaperSvg(options: ToSVGOptions, elementSizePadding: number): {
    svgClone: SVGSVGElement;
    imageBounds: { [path: string]: Bounds };
} {
    const {model, paper, getOverlayedElement} = options;
    const svgClone = paper.cloneNode(true) as SVGSVGElement;
    svgClone.removeAttribute('class');
    svgClone.removeAttribute('style');

    function findViewport() {
        let child = svgClone.firstChild;
        while (child) {
            if (child instanceof SVGGElement) { return child; }
            child = child.nextSibling;
        }
        return undefined;
    }

    const viewport = findViewport();
    viewport.removeAttribute('transform');

    // TODO, needed for proper export of the diagram with custom app as of April 2020, remove when we refactor ResearchSpace styling
    viewport.setAttribute('class', 'rs-application');

    const imageBounds: { [path: string]: Bounds } = {};

    for (const element of model.elements) {
        const modelId = element.id;
        const overlayedView = getOverlayedElement(modelId);
        if (!overlayedView) { continue; }

        const elementRoot = document.createElementNS(SVG_NAMESPACE, 'g');
        const overlayedViewContent = overlayedView.firstChild.cloneNode(true) as HTMLElement;
        elementRoot.setAttribute('class', 'ontodia-exported-element');

        let newRoot;
        newRoot = document.createElementNS(SVG_NAMESPACE, 'foreignObject');
        newRoot.appendChild(overlayedViewContent);
        const {x, y, width, height} = boundsOf(element);
        newRoot.setAttribute('transform', `translate(${x},${y})`);
        newRoot.setAttribute('width', (width + elementSizePadding).toString());
        newRoot.setAttribute('height', (height + elementSizePadding).toString());

        elementRoot.appendChild(newRoot);
        viewport.appendChild(elementRoot);

        const clonedNodes = overlayedViewContent.querySelectorAll('img');

        foreachNode(overlayedView.querySelectorAll('img'), (img, index) => {
            const exportKey = uniqueId('export-key-');
            clonedNodes[index].setAttribute('export-key', exportKey);
            imageBounds[exportKey] = {
                width: img.clientWidth,
                height: img.clientHeight,
            };
        });
    }

    return {svgClone, imageBounds};
}

function exportImageAsDataUri(original: HTMLImageElement): Promise<string> {
    const url = original.src;
    if (!url || url.startsWith('data:')) {
        return Promise.resolve(url);
    }

    return exportAsDataUri(url);
}

async function exportAsDataUri(url: string) {
    const result = await fetch(url);
    const blob = await result.blob();
    return new Promise<string>(resolve => {
        let reader = new FileReader();
        reader.onload = () => {
            resolve((reader.result as string));
        };
        reader.readAsDataURL(blob);
    });
}

function foreachNode<T extends Node>(nodeList: NodeListOf<T>, callback: (node?: T, index?: number) => void) {
    for (let i = 0; i < nodeList.length; i++) {
        callback(nodeList[i], i);
    }
}

export interface ToDataURLOptions {
    /** 'image/png' | 'image/jpeg' | ... */
    mimeType?: string;
    width?: number;
    height?: number;
    /** Background color, transparent by default. */
    backgroundColor?: string;
    quality?: number;
}

const MAX_CANVAS_LENGTH = 4096;

export async function toDataURL(options: ToSVGOptions & ToDataURLOptions): Promise<string> {
    const {mimeType = 'image/png'} = options;
    const svgOptions = {
        ...options,
        convertImagesToDataUris: true,
        preserveDimensions: true,
    };
    const svg = await exportSVG(svgOptions);
    const svgBox: Bounds = {
        width: Number(svg.getAttribute('width')),
        height: Number(svg.getAttribute('height')),
    };

    const containerSize = (typeof options.width === 'number' || typeof options.height === 'number')
        ? {width: options.width, height: options.height}
        : fallbackContainerSize(svgBox);

    const {innerSize, outerSize, offset} = computeAutofit(svgBox, containerSize);
    svg.setAttribute('width', innerSize.width.toString());
    svg.setAttribute('height', innerSize.height.toString());
    const svgString = new XMLSerializer().serializeToString(svg);

    const {canvas, context} = createCanvas(
        outerSize.width,
        outerSize.height,
        options.backgroundColor,
    );

    const image = await loadImage('data:image/svg+xml,' + encodeURIComponent(svgString));
    context.drawImage(image, offset.x, offset.y, innerSize.width, innerSize.height);
    return canvas.toDataURL(mimeType, options.quality);

    function createCanvas(canvasWidth: number, canvasHeight: number, backgroundColor?: string) {
        const cnv = document.createElement('canvas');
        cnv.width = canvasWidth;
        cnv.height = canvasHeight;
        const cnt = cnv.getContext('2d');
        if (backgroundColor) {
            cnt.fillStyle = backgroundColor;
            cnt.fillRect(0, 0, canvasWidth, canvasHeight);
        }
        return {canvas: cnv, context: cnt};
    }
}

export function loadImage(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = function () {
            resolve(image);
        };
        image.onerror = function (ev) {
            reject(ev);
        };
        image.src = source;
    });
}

function computeAutofit(itemSize: Bounds, containerSize: Bounds) {
    const fit = fitRectKeepingAspectRatio(
        itemSize.width,
        itemSize.height,
        containerSize.width,
        containerSize.height,
    );
    const innerSize: Bounds = {
        width: Math.floor(fit.width),
        height: Math.floor(fit.height),
    };
    const outerSize: Bounds = {
        width: typeof containerSize.width === 'number' ? containerSize.width : innerSize.width,
        height: typeof containerSize.height === 'number' ? containerSize.height : innerSize.height,
    };
    const offset: Vector = {
        x: Math.round((outerSize.width - innerSize.width) / 2),
        y: Math.round((outerSize.height - innerSize.height) / 2),
    };
    return {innerSize, outerSize, offset};
}

function fallbackContainerSize(itemSize: Bounds): Bounds {
    const maxResolutionScale = Math.min(
        MAX_CANVAS_LENGTH / itemSize.width,
        MAX_CANVAS_LENGTH / itemSize.height,
    );
    const resolutionScale = Math.min(2.0, maxResolutionScale);
    const width = Math.floor(itemSize.width * resolutionScale);
    const height = Math.floor(itemSize.height * resolutionScale);
    return {width, height};
}

export function fitRectKeepingAspectRatio(
    sourceWidth: number,
    sourceHeight: number,
    targetWidth: number | undefined,
    targetHeight: number | undefined,
): { width: number; height: number } {
    if (!(typeof targetWidth === 'number' || typeof targetHeight === 'number')) {
        return {width: sourceWidth, height: sourceHeight};
    }
    const sourceAspectRatio = sourceWidth / sourceHeight;
    targetWidth = typeof targetWidth === 'number' ? targetWidth : targetHeight * sourceAspectRatio;
    targetHeight = typeof targetHeight === 'number' ? targetHeight : targetWidth / sourceAspectRatio;
    if (targetHeight * sourceAspectRatio <= targetWidth) {
        return {width: targetHeight * sourceAspectRatio, height: targetHeight};
    } else {
        return {width: targetWidth, height: targetWidth / sourceAspectRatio};
    }
}

/**
 * Creates and returns a blob from a data URL (either base64 encoded or not).
 *
 * @param {string} dataURL The data URL to convert.
 * @return {Blob} A blob representing the array buffer data.
 */
export function dataURLToBlob(dataURL: string): Blob {
    const BASE64_MARKER = ';base64,';
    if (dataURL.indexOf(BASE64_MARKER) === -1) {
        const parts = dataURL.split(',');
        const contentType = parts[0].split(':')[1];
        const raw = decodeURIComponent(parts[1]);

        return new Blob([raw], {type: contentType});
    } else {
        const parts = dataURL.split(BASE64_MARKER);
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;

        const uInt8Array = new Uint8Array(rawLength);

        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }

        return new Blob([uInt8Array], {type: contentType});
    }
}
