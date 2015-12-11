import {
    createSelector,
    createSelectorCreator,
    defaultMemoize,
} from 'reselect';

import Immutable from 'immutable';

function createEquivalenceSelector(selectors, output) {
    return createSelectorCreator(
        defaultMemoize,
        Immutable.is
    )(selectors, output);
}

function createIdentitySelector(selector) {
    return createEquivalenceSelector(
        [selector],
        output => output
    );
}

function createArraySelector(selectors) {
    return createEquivalenceSelector(
        selectors,
        (...output) => output
    );
}

function retrieveModel(state, sourceModel, id) {
    return state.getIn([sourceModel, id]);
}

function createModelSelector(sourceModel, id, whiteList, blackList) {
    let modelSelector = createSelector(
        [state => state],
        state => retrieveModel(state, sourceModel, id)
    );

    if (whiteList) {
        modelSelector = createIdentitySelector(
            createSelector(
                modelSelector,
                model => model.filter((v, k) => whiteList.indexOf(k) !== -1)
            )
        );
    }

    if (blackList) {
        modelSelector = createIdentitySelector(
            createSelector(
                modelSelector,
                model => model.filter((v, k) => blackList.indexOf(k) === -1)
            )
        );
    }

    return modelSelector;
}

export function createRelationRetriever(relation, id) {
    if (!id) {
        return () => null;
    }

    return relation.selectorCreator ?
        relation.selectorCreator(id) :
        createModelSelector(relation.model, id, relation.whiteList, relation.blackList);
}

function createSingleSelector(sourceModel, id, relations) {
    return createArraySelector(relations.map(relation => createSingleRetrievalSelectorCreator(sourceModel, relation)(id)));
}

function createMultiSelector(sourceModel, id, relations) {
    return createArraySelector(relations.map(relation => createMultiRetrievalSelectorCreator(sourceModel, relation)(id)));
}

function createReverseSelector(id, relations) {
    return createArraySelector(relations.map(relation => createReverseRetrievalSelectorCreator(relation)(id)));
}

function hydrateHelper(model, relation, relatedData) {
    return model.set(relation.field, relatedData);
}

function hydrateModel(singleRelations, multiRelations, reverseRelations) {
    return createSelector(
        (source, singleRelationModels, multiRelationModels, reverseRelationModels) =>
            source ? source.withMutations(source =>
                reverseRelations.reduce(
                    (model, relation, i) => hydrateHelper(model, relation, reverseRelationModels[i]),
                    multiRelations.reduce(
                        (model, relation, i) => hydrateHelper(model, relation, multiRelationModels[i]),
                        singleRelations.reduce(
                            (model, relation, i) => hydrateHelper(model, relation, singleRelationModels[i]),
                            source
                        )
                    )
                )
            ) : Immutable.Map(),
        model => model
    );
}

export function createSingleRetrievalSelectorCreator(sourceModel, relation) {
    return id => {
        if (!id) {
            throw new Error('id is falsy');
        }
        const singleRetrieverSelector = createSelector(
            [
                state => state.getIn([sourceModel, id, relation.field_id])
            ],
            related_id => createRelationRetriever(relation, related_id)
        );

        return createIdentitySelector(state => singleRetrieverSelector(state)(state));
    };
}

export function createMultiRetrievalSelectorCreator(sourceModel, relation) {
    return id => {
        if (!id) {
            throw new Error('id is falsy');
        }
        const multiRetrieversSelector = createEquivalenceSelector(
            [
                state => state.getIn([sourceModel, id, relation.field_id])
            ],
            related_ids => related_ids.map(related_id => createRelationRetriever(relation, related_id))
        );

        return createIdentitySelector(state => multiRetrieversSelector(state).map(retriever => retriever(state)));
    };
}

export function createReverseRetrievalSelectorCreator(relation) {
    return id => {
        if (!id) {
            throw new Error('id is falsy');
        }
        const reverseRetrieversSelector = createEquivalenceSelector(
            [
                state => state.get(relation.model).toSeq().filter(model =>
                    model.get(relation.field_id) === id
                ).map((_, related_id) =>
                    related_id
                ).toIndexedSeq()
            ],
            related_ids => related_ids.map(related_id => createRelationRetriever(relation, related_id))
        );

        return createIdentitySelector(state => reverseRetrieversSelector(state).map(retriever => retriever(state)));
    }
}

export function createModelSelectorCreator(sourceModel, singleRelations = [], multiRelations = [], reverseRelations = [], whiteList = null, blackList = null) {
    return id => {
        if (!id) {
            throw new Error('id is falsy');
        }
        return createSelector(
            [
                createModelSelector(sourceModel, id, whiteList, blackList),
                createSingleSelector(sourceModel, id, singleRelations),
                createMultiSelector(sourceModel, id, multiRelations),
                createReverseSelector(id, reverseRelations),
            ],
            hydrateModel(singleRelations, multiRelations, reverseRelations)
        );
    }
}

export default {
    createSingleRetrievalSelectorCreator,
    createMultiRetrievalSelectorCreator,
    createModelSelectorCreator,
};
