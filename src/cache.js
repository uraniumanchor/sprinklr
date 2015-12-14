import Immutable from 'immutable';

import schema from './schema';

export default class Cache {
    constructor(schema) {
        this.schema = Immutable.fromJS(schema);
        this.cache = Immutable.Map();
    }

    selector(root) {
        const generator = this.cache.get(root) || schema.createSelectorFromSchemaCreator(root, this.schema);
        this.cache = this.cache.set(root, generator);
        return generator;
    }

    size() {
        return this.cache.size;
    }
}
