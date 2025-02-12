/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from 'vs/base/common/event';
import { Disposable } from 'vs/base/common/lifecycle';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { WebviewThemeDataProvider } from 'vs/workbench/contrib/webview/browser/themeing';
import { IWebviewService, IWebview, WebviewContentOptions, IWebviewElement, WebviewExtensionDescription, WebviewOptions, IOverlayWebview } from 'vs/workbench/contrib/webview/browser/webview';
import { WebviewElement } from 'vs/workbench/contrib/webview/browser/webviewElement';
import { OverlayWebview } from './overlayWebview';

export class WebviewService extends Disposable implements IWebviewService {
	declare readonly _serviceBrand: undefined;

	protected readonly _webviewThemeDataProvider: WebviewThemeDataProvider;

	constructor(
		@IInstantiationService protected readonly _instantiationService: IInstantiationService,
	) {
		super();
		this._webviewThemeDataProvider = this._instantiationService.createInstance(WebviewThemeDataProvider);
	}

	private _activeWebview?: IWebview;

	public get activeWebview() { return this._activeWebview; }

	private updateActiveWebview(value: IWebview | undefined) {
		if (value !== this._activeWebview) {
			this._activeWebview = value;
			this._onDidChangeActiveWebview.fire(value);
		}
	}

	private _webviews = new Set<IWebview>();

	public get webviews(): Iterable<IWebview> {
		return this._webviews.values();
	}

	private readonly _onDidChangeActiveWebview = this._register(new Emitter<IWebview | undefined>());
	public readonly onDidChangeActiveWebview = this._onDidChangeActiveWebview.event;

	createWebviewElement(
		id: string,
		options: WebviewOptions,
		contentOptions: WebviewContentOptions,
		extension: WebviewExtensionDescription | undefined,
	): IWebviewElement {
		const webview = this._instantiationService.createInstance(WebviewElement, id, options, contentOptions, extension, this._webviewThemeDataProvider);
		this.registerNewWebview(webview);
		return webview;
	}

	createWebviewOverlay(
		id: string,
		options: WebviewOptions,
		contentOptions: WebviewContentOptions,
		extension: WebviewExtensionDescription | undefined,
	): IOverlayWebview {
		const webview = this._instantiationService.createInstance(OverlayWebview, id, options, contentOptions, extension);
		this.registerNewWebview(webview);
		return webview;
	}

	protected registerNewWebview(webview: IWebview) {
		this._webviews.add(webview);

		webview.onDidFocus(() => {
			this.updateActiveWebview(webview);
		});

		const onBlur = () => {
			if (this._activeWebview === webview) {
				this.updateActiveWebview(undefined);
			}
		};

		webview.onDidBlur(onBlur);
		webview.onDidDispose(() => {
			onBlur();
			this._webviews.delete(webview);
		});
	}
}
