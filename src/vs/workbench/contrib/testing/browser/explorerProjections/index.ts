/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ObjectTree } from 'vs/base/browser/ui/tree/objectTree';
import { Event } from 'vs/base/common/event';
import { FuzzyScore } from 'vs/base/common/filters';
import { IMarkdownString } from 'vs/base/common/htmlContent';
import { Iterable } from 'vs/base/common/iterator';
import { IDisposable } from 'vs/base/common/lifecycle';
import { TestResultState } from 'vs/workbench/api/common/extHostTypes';
import { identifyTest, InternalTestItem, ITestIdWithSrc } from 'vs/workbench/contrib/testing/common/testCollection';

/**
 * Describes a rendering of tests in the explorer view. Different
 * implementations of this are used for trees and lists, and groupings.
 * Originally this was implemented as inline logic within the ViewModel and
 * using a single IncrementalTestChangeCollector, but this became hairy
 * with status projections.
 */
export interface ITestTreeProjection extends IDisposable {
	/**
	 * Event that fires when the projection changes.
	 */
	onUpdate: Event<void>;

	/**
	 * Fired when an element in the tree is expanded.
	 */
	expandElement(element: TestItemTreeElement, depth: number): void;

	/**
	 * Gets an element by its extension-assigned ID.
	 */
	getElementByTestId(testId: string): TestItemTreeElement | undefined;

	/**
	 * Applies pending update to the tree.
	 */
	applyTo(tree: ObjectTree<TestExplorerTreeElement, FuzzyScore>): void;
}

/**
 * Interface describing the workspace folder and test item tree elements.
 */
export interface IActionableTestTreeElement {
	/**
	 * Parent tree item.
	 */
	parent: IActionableTestTreeElement | null;

	/**
	 * Unique ID of the element in the tree.
	 */
	treeId: string;

	/**
	 * Test children of this item.
	 */
	children: Set<TestExplorerTreeElement>;

	/**
	 * Depth of the element in the tree.
	 */
	depth: number;

	/**
	 * Tests to debug when the 'debug' context action is taken on this item.
	 */
	debuggable: Iterable<ITestIdWithSrc>;

	/**
	 * Tests to run when the 'debug' context action is taken on this item.
	 */
	runnable: Iterable<ITestIdWithSrc>;

	/**
	 * State to show on the item. This is generally the item's computed state
	 * from its children.
	 */
	state: TestResultState;

	/**
	 * Time it took this test/item to run.
	 */
	duration: number | undefined;

	/**
	 * Label for the item.
	 */
	label: string;
}

let idCounter = 0;

const getId = () => String(idCounter++);

export class TestItemTreeElement implements IActionableTestTreeElement {
	/**
	 * @inheritdoc
	 */
	public readonly children = new Set<TestExplorerTreeElement>();

	/**
	 * @inheritdoc
	 */
	public readonly treeId = getId();

	/**
	 * @inheritdoc
	 */
	public depth: number = this.parent ? this.parent.depth + 1 : 0;

	/**
	 * @inheritdoc
	 */
	public get runnable() {
		return this.test.item.runnable
			? Iterable.single(identifyTest(this.test))
			: Iterable.empty();
	}

	/**
	 * @inheritdoc
	 */
	public get debuggable() {
		return this.test.item.debuggable
			? Iterable.single(identifyTest(this.test))
			: Iterable.empty();
	}

	public get description() {
		return this.test.item.description;
	}

	/**
	 * Whether the node's test result is 'retired' -- from an outdated test run.
	 */
	public retired = false;

	/**
	 * @inheritdoc
	 */
	public state = TestResultState.Unset;

	/**
	 * Own, non-computed state.
	 */
	public ownState = TestResultState.Unset;

	/**
	 * Own, non-computed duration.
	 */
	public ownDuration: number | undefined;

	/**
	 * Time it took this test/item to run.
	 */
	public duration: number | undefined;

	/**
	 * @inheritdoc
	 */
	public get label() {
		return this.test.item.label;
	}

	constructor(
		public readonly test: InternalTestItem,
		public readonly parent: TestItemTreeElement | null = null,
	) { }
}

export class TestTreeErrorMessage {
	public readonly treeId = getId();
	public readonly children = new Set<never>();

	public get description() {
		return typeof this.message === 'string' ? this.message : this.message.value;
	}

	constructor(
		public readonly message: string | IMarkdownString,
		public readonly parent: TestExplorerTreeElement,
	) { }
}

export type TestExplorerTreeElement = TestItemTreeElement | TestTreeErrorMessage;
