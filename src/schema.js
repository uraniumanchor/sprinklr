import Immutable from 'immutable';

import models from './models';


function traverseModel(root, schema, types, relationsFollowed, cachedCreators) {
    return [schema.get(root).toSeq().filter(
        relation => types.indexOf(relation.get('type')) !== -1
    ).reduce(
        (relations, relation, field) => {
            if (!relationsFollowed.contains(Immutable.Set([root, relation.get('model')]))) {
                relationsFollowed = relationsFollowed.add(Immutable.Set([relation.get('model'), root]));
                let selectorCreator = cachedCreators.get(relation.get('model'));
                if (!selectorCreator) {
                    [selectorCreator, cachedCreators] = traverseTree(relation.get('model'), schema, relationsFollowed, cachedCreators, [relation.get('field') || field]);
                }
                relations.push({
                    field,
                    model: relation.get('model'),
                    field_id: relation.get('field') || field,
                    selectorCreator,
                });
            }
            return relations;
        }, []
    ), cachedCreators];
}

function traverseTree(root, schema, relationsFollowed, cachedCreators, blacklist = undefined) {
    let singleRelations;
    let multiRelations;
    let reverseRelations;
    if (schema.get(root)) {
        [singleRelations, cachedCreators] = traverseModel(root, schema, ['parent', 'friend'], relationsFollowed, cachedCreators);
        [multiRelations, cachedCreators] = traverseModel(root, schema, ['friends'], relationsFollowed, cachedCreators);
        [reverseRelations, cachedCreators] = traverseModel(root, schema, ['children'], relationsFollowed, cachedCreators);
    }
    const creator = models.createModelSelectorCreator(root, {singleRelations, multiRelations, reverseRelations, blacklist});
    return [creator, cachedCreators.set(root, creator)];
}

export function createSelectorFromSchemaCreator(root, schema) {
    return traverseTree(root, Immutable.fromJS(schema), Immutable.Set(), Immutable.Map())[0];
}

export default {
    createSelectorFromSchemaCreator,
};
