import {
    createRelationRetriever,
    createSingleRetrievalSelectorCreator,
    createMultiRetrievalSelectorCreator,
    createReverseRetrievalSelectorCreator,
    createModelSelectorCreator,
} from './models';

import {
    flatToImmutable
} from './util';

import Immutable from 'immutable';

describe('models', () => {
    let state;
    beforeEach(() => {
        state = flatToImmutable({
            a: {
                1: {
                    quux: 'hello',
                    b_id: 2,
                    c_id: 3,
                    d_ids: [5, 6],
                    e_ids: [7, 8, 9],
                },
            },
            b: {
                2: {
                    name: 'foo',
                    f_id: 11,
                    g_ids: [12],
                },
            },
            c: {
                3: {
                    bar: 'baz',
                    e_id: 7,
                },
                4: {
                    yes: 'no',
                },
            },
            d: {
                5: {
                    bye: 'good',
                    e_id: 7,
                },
                6: {
                    bye: 'bad',
                    e_id: 8,
                },
            },
            e: {
                7: {},
                8: {},
                9: {},
                10: {},
            },
            f: {
                11: {amazing: 'not at all'},
            },
            g: {
                12: {gluten: 'free'},
            },
            h: {
                13: {a_id: 1, rock: 'out'},
                14: {a_id: 1, rock: 'hard'},
                15: {a_id: 2, rock: 'all night'},
            },
            i: {
                16: {white: true, gray: 'shades', black: false},
            },
        });
    });

    describe('createRelationRetriever', () => {
        let relationRetriever;
        describe('with a whitelist', () => {
            beforeEach(() => {
                relationRetriever = createRelationRetriever({model: 'a', whitelist: ['pk', 'b_id']}, 1);
                relationRetriever(state);
            });

            it('fetches keys on the whitelist', () => {
                expect(relationRetriever(state).get('pk')).toBe(1);
                expect(relationRetriever(state).get('b_id')).toBe(2);
            });

            it('ignores keys not on the whitelist', () => {
                expect(relationRetriever(state).get('quux')).not.toBeDefined();
                expect(relationRetriever(state).get('c_id')).not.toBeDefined();
                expect(relationRetriever(state).get('d_ids')).not.toBeDefined();
                expect(relationRetriever(state).get('e_ids')).not.toBeDefined();
            });

            it('triggers a change if a key on the whitelist changes', () => {
                const state2 = state.setIn(['a', 1, 'b_id'], 3);
                expect(relationRetriever(state2).get('b_id')).toBe(3);
                expect(relationRetriever.recomputations()).toBe(2);
            });

            it('does not trigger a change if a key not on the whitelist changes', () => {
                const state2 = state.setIn(['a', 1, 'quux'], 'bye');
                expect(relationRetriever(state2)).toBe(relationRetriever(state));
                expect(relationRetriever.recomputations()).toBe(1);
            });
        });

        describe('with a blacklist', () => {
            beforeEach(() => {
               relationRetriever = createRelationRetriever({model: 'a', blacklist: ['pk', 'b_id']}, 1);
               relationRetriever(state);
            });

            it('fetches keys not on the blacklist', () => {
                expect(relationRetriever(state).get('quux')).toBe('hello');
                expect(relationRetriever(state).get('c_id')).toBe(3);
                expect(relationRetriever(state).get('d_ids')).toEqual(Immutable.List([5, 6]));
                expect(relationRetriever(state).get('e_ids')).toEqual(Immutable.List([7, 8, 9]));
            });

            it('ignores keys on the blacklist', () => {
                expect(relationRetriever(state).get('pk')).not.toBeDefined();
                expect(relationRetriever(state).get('b_id')).not.toBeDefined();
            });

            it('triggers a change if a key not on the blacklist changes', () => {
                const state2 = state.setIn(['a', 1, 'quux'], 'bye');
                expect(relationRetriever(state2).get('quux')).toBe('bye');
                expect(relationRetriever.recomputations()).toBe(2);
            });

            it('does not trigger a change if a key on the blacklist changes', () => {
                const state2 = state.setIn(['a', 1, 'b_id'], 100);
                expect(relationRetriever(state2)).toBe(relationRetriever(state));
                expect(relationRetriever.recomputations()).toBe(1);
            });
        });
    });

    describe('createSingleRetrievalSelectorCreator', () => {
        let singleSelector;
        describe('with a simple selector', () => {
            beforeEach(() => {
                singleSelector = createSingleRetrievalSelectorCreator('a', {field: 'c', model: 'c', field_id: 'c_id'})(1);
                singleSelector(state);
            });

            it('hydrates the relation', () => {
                expect(singleSelector(state).get('bar')).toBe('baz');
                expect(singleSelector.recomputations()).toBe(1);
            });

            it('recalculates if the relation on the original changes', () => {
                const state2 = state.setIn(['a', 1, 'c_id'], 4);
                expect(singleSelector(state2).get('yes')).toBe('no');
                expect(singleSelector.recomputations()).toBe(2);
            });

            it('recalculates if one of the models pointed to by the relation changes', () => {
                const state2 = state.setIn(['c', 3, 'bar'], 'buzz');
                expect(singleSelector(state2).get('bar')).toBe('buzz');
                expect(singleSelector.recomputations()).toBe(2);
            });

            it('does not recalculate if an unrelated field on the original model changes', () => {
                const state2 = state.setIn(['a', 1, 'quux'], 'what');
                expect(singleSelector(state2)).toBe(singleSelector(state));
                expect(singleSelector.recomputations()).toBe(1);
            });
        });

        describe('with a complex selector', () => {
            beforeEach(() => {
                const complexSelector = id => {
                    const modelSelector = createModelSelectorCreator('c', {singleRelations: [{ field: 'e', model: 'e', field_id: 'e_id'}]})(id);
                    return state => {
                        return modelSelector(state);
                    };
                };
                singleSelector = createSingleRetrievalSelectorCreator('a', {field: 'c', model: 'c', field_id: 'c_id', selectorCreator: complexSelector})(1);
                singleSelector(state);
            });

            it('hydrates the relation', () => {
                expect(singleSelector(state).get('bar')).toBe('baz');
                expect(singleSelector(state).getIn(['e', 'pk'])).toBe(7);
            });

            it('does not recalculate', () => {
                expect(singleSelector(state)).toBe(singleSelector(state));
                expect(singleSelector.recomputations()).toBe(1);
            });
        });

    });

    describe('createMultiRetrievalSelectorCreator', () => {
        let multiSelector;
        describe('with a simple selector', () => {
            beforeEach(() => {
                multiSelector = createMultiRetrievalSelectorCreator('a', {field: 'd', model: 'd', field_id: 'd_ids'})(1);
                multiSelector(state);
            });

            it('hydrates the relation', () => {
                expect(multiSelector(state).find(d => d.get('bye') === 'good')).toBeDefined();
                expect(multiSelector(state).find(d => d.get('bye') === 'bad')).toBeDefined();
                expect(multiSelector(state).size).toBe(2);
                expect(multiSelector.recomputations()).toBe(1);
            });

            it('recalculates if the relation on the original changes', () => {
                const state2 = state.updateIn(['a', 1, 'd_ids'], list => list.pop());
                expect(multiSelector(state2).size).toBe(1);
                expect(multiSelector.recomputations()).toBe(2);
            });

            it('recalculates if one of the models pointed to by the relation changes', () => {
                const state2 = state.setIn(['d', 5, 'bye'], 'maybe');
                expect(multiSelector(state2).find(d => d.get('bye') === 'maybe')).toBeDefined();
                expect(multiSelector.recomputations()).toBe(2);
            });

            it('does not recalculate if an unrelated field on the original model changes', () => {
                const state2 = state.setIn(['a', 1, 'quux'], 'what');
                expect(multiSelector(state2)).toBe(multiSelector(state));
                expect(multiSelector.recomputations()).toBe(1);
            });
        });

        describe('with a complex selector', () => {
            beforeEach(() => {
                const complexSelector = id => {
                    const modelSelector = createModelSelectorCreator('d', {singleRelations: [{ field: 'e', model: 'e', field_id: 'e_id'}]})(id);
                    return state => {
                        return modelSelector(state);
                    };
                };
                multiSelector = createMultiRetrievalSelectorCreator('a', {field: 'd', model: 'd', field_id: 'd_ids', selectorCreator: complexSelector})(1);
                multiSelector(state);
            });

            it('hydrates the relation', () => {
                expect(multiSelector(state).find(d => d.getIn(['e', 'pk']) === 7)).toBeDefined();
                expect(multiSelector(state).find(d => d.getIn(['e', 'pk']) === 8)).toBeDefined();
            });

            it('does not recalculate', () => {
                expect(multiSelector(state)).toBe(multiSelector(state));
                expect(multiSelector.recomputations()).toBe(1);
            });
        });
    });

    describe('createReverseRetrievalSelectorCreator', () => {
        let reverseSelector;
        describe('with a simple selector', () => {
            beforeEach(() => {
                reverseSelector = createReverseRetrievalSelectorCreator({field: 'h_set', model: 'h', field_id: 'a_id'})(1);
                reverseSelector(state);
            });

            it('hydrates the relation', () => {
                expect(reverseSelector(state).toList().size).toBe(2);
                expect(reverseSelector(state).find(v => v.get('rock') === 'out')).toBeDefined();
                expect(reverseSelector(state).find(v => v.get('rock') === 'hard')).toBeDefined();
                expect(reverseSelector.recomputations()).toBe(1);
            });

            it('recalculates if an object is added', () => {
                const state2 = state.setIn(['h', 15], Immutable.fromJS({ rock: 'solid', a_id: 1}));
                expect(reverseSelector(state2).size).toBe(3);
                expect(reverseSelector(state2).find(h => h.get('rock') === 'solid')).toBeDefined();
                expect(reverseSelector.recomputations()).toBe(2);
            });

            it('recalculates if an object is deleted', () => {
                const state2 = state.deleteIn(['h', 14]);
                expect(reverseSelector(state2).size).toBe(1);
                expect(reverseSelector.recomputations()).toBe(2);
            });

            it('recalculates if an object is moved', () => {
                const state2 = state.setIn(['h', 14, 'a_id'], 2);
                expect(reverseSelector(state2).size).toBe(1);
                expect(reverseSelector.recomputations()).toBe(2);
            });

            it('recalculates if an object is changed', () => {
                const state2 = state.setIn(['h', 13, 'rock'], 'on');
                expect(reverseSelector(state2).find(h => h.get('rock') === 'on')).toBeDefined();
                expect(reverseSelector.recomputations()).toBe(2);
            });

            it('does not recalculate if an unrelated object is added', () => {
                const state2 = state.setIn(['h', 16], Immutable.fromJS({ rock: 'all night', a_id: 2}));
                expect(reverseSelector(state2)).toBe(reverseSelector(state));
                expect(reverseSelector.recomputations()).toBe(1);
            });

            it('does not recalculate if an unrelated object is deleted', () => {
                const state2 = state.deleteIn(['h', 15]);
                expect(reverseSelector(state2)).toBe(reverseSelector(state));
                expect(reverseSelector.recomputations()).toBe(1);
            });

            it('does not recalculate if an unrelated object is moved', () => {
                const state2 = state.setIn(['h', 15, 'a_id'], 3);
                expect(reverseSelector(state2)).toBe(reverseSelector(state));
                expect(reverseSelector.recomputations()).toBe(1);
            });

            it('does not recalculate if an unrelated object is changed', () => {
                const state2 = state.setIn(['h', 15, 'rock'], 'until the morning sun');
                expect(reverseSelector(state2)).toBe(reverseSelector(state));
                expect(reverseSelector.recomputations()).toBe(1);
            });
        });
    });

    describe('createModelSelectorCreator', () => {
        let modelSelector;
        describe('nested selector', () => {
            beforeEach(() => {
                const subSelectorCreator = createModelSelectorCreator('b', {
                    singleRelations: [{field: 'f', model: 'f', field_id: 'f_id'}],
                    multiRelations: [{field: 'g', model: 'g', field_id: 'g_ids'}],
                });

                const singleRelations = [
                    {field: 'b', model: 'b', field_id: 'b_id', selectorCreator: subSelectorCreator},
                    {field: 'c', model: 'c', field_id: 'c_id'},
                ];

                const multiRelations = [
                    {field: 'd', model: 'd', field_id: 'd_ids'},
                    {field: 'e', model: 'e', field_id: 'e_ids'},
                ];

                const reverseRelations = [
                    {field: 'h_set', model: 'h', field_id: 'a_id'},
                ];

                modelSelector = createModelSelectorCreator('a', {singleRelations, multiRelations, reverseRelations})(1);
                modelSelector(state);
            });

            it('hydrates a single model', () => {
                expect(modelSelector(state).get('quux')).toBe('hello');
                expect(modelSelector(state).getIn(['b', 'name'])).toBe('foo');
                expect(modelSelector(state).getIn(['b', 'f', 'amazing'])).toBe('not at all');
                expect(modelSelector(state).getIn(['b', 'g']).size).toBe(1);
                expect(modelSelector(state).getIn(['b', 'g']).find(g => g.get('gluten') === 'free')).toBeDefined()
                expect(modelSelector(state).getIn(['c', 'bar'])).toBe('baz');
                expect(modelSelector(state).get('d').size).toBe(2);
                expect(modelSelector(state).get('d').find(d => d.get('bye') === 'good')).toBeDefined();
                expect(modelSelector(state).get('e').size).toBe(3);
                expect(modelSelector(state).get('e').find(e => e.get('pk') === 8)).toBeDefined();
                expect(modelSelector(state).get('h_set').size).toBe(2);
                expect(modelSelector(state).get('h_set').find(h => h.get('rock') === 'out')).toBeDefined();
                expect(modelSelector(state)).toBe(modelSelector(state));
                expect(modelSelector.recomputations()).toBe(1);
            });

            it('changing the model triggers a change', () => {
                const state2 = state.setIn(['a', 1, 'quux'], 'bye');
                expect(modelSelector(state2).get('quux')).toBe('bye');
                expect(modelSelector(state2)).toBe(modelSelector(state2));
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('no-op on the model does not trigger a change', () => {
                modelSelector(state.setIn(['a', 1, 'quux'], 'hello'));
                expect(modelSelector.recomputations()).toBe(1);
            });

            it('changing a single relation triggers a change', () => {
                const state2 = state.setIn(['a', 1, 'c_id'], 4);
                expect(modelSelector(state2).getIn(['c', 'yes'])).toBe('no');
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('adding to a multi relation triggers a change', () => {
                const state2 = state.updateIn(['a', 1, 'e_ids'], list => list.push(10));
                expect(modelSelector(state2).getIn(['e']).size).toBe(4);
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('removing from a multi relation triggers a change', () => {
                const state2 = state.updateIn(['a', 1, 'e_ids'], list => list.pop());
                expect(modelSelector(state2).getIn(['e']).size).toBe(2);
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('adding a reverse relation triggers a change', () => {
                const state2 = state.setIn(['h', 15], Immutable.fromJS({ rock: 'solid', a_id: 1}));
                expect(modelSelector(state2).getIn(['h_set']).size).toBe(3);
                expect(modelSelector(state2).get('h_set').find(h => h.get('rock') === 'solid')).toBeDefined();
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('deleting a reverse relation triggers a change', () => {
                const state2 = state.deleteIn(['h', 14]);
                expect(modelSelector(state2).getIn(['h_set']).size).toBe(1);
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('moving a reverse relation triggers a change', () => {
                const state2 = state.setIn(['h', 14, 'a_id'], 2);
                expect(modelSelector(state2).getIn(['h_set']).size).toBe(1);
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('changing a singly related model triggers a change', () => {
                const state2 = state.setIn(['b', 2, 'name'], 'bar');
                expect(modelSelector(state2).getIn(['b', 'name'])).toBe('bar');
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('changing a deeply singly related model triggers a change', () => {
                const state2 = state.setIn(['f', 11, 'amazing'], 'absolutely');
                expect(modelSelector(state2).getIn(['b', 'f', 'amazing'])).toBe('absolutely');
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('no-op on a singly related model does not trigger a change', () => {
                modelSelector(state.setIn(['b', 2, 'name'], 'foo'));
                expect(modelSelector.recomputations()).toBe(1);
            });

            it('changing a singly unrelated model does not trigger a change', () => {
                modelSelector(state.setIn(['c', 4, 'yes'], 'always'));
                expect(modelSelector.recomputations()).toBe(1);
            });

            it('changing a multi related model triggers a change', () => {
                const state2 = state.setIn(['d', 5, 'bye'], 'maybe');
                expect(modelSelector(state2).get('d').find(d => d.get('bye') === 'maybe')).toBeDefined();
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('changing a deeply multi related model triggers a change', () => {
                const state2 = state.setIn(['g', 12, 'gluten'], 'lots');
                expect(modelSelector(state2).getIn(['b', 'g']).first().get('gluten')).toBe('lots');
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('no-op on a multi related model does not trigger a change', () => {
                modelSelector(state.setIn(['d', 5, 'bye'], 'good'));
                expect(modelSelector.recomputations()).toBe(1);
            });

            it('changing a multi unrelated model does not trigger a change', () => {
                modelSelector(state.setIn(['e', 10, 'yes'], 'always'));
                expect(modelSelector.recomputations()).toBe(1);
            });

            it('changing a reverse related model triggers a change', () => {
                const state2 = state.setIn(['h', 13, 'rock'], 'on');
                expect(modelSelector(state2).get('h_set').find(h => h.get('rock') === 'on')).toBeDefined();
                expect(modelSelector.recomputations()).toBe(2);
            });
        });

        describe('with a whitelist', () => {
            beforeEach(() => {
                modelSelector = createModelSelectorCreator('i', {whitelist: ['pk', 'white', 'gray']})(16);
                modelSelector(state);
            });

            it('fetches keys on the white list', () => {
                expect(modelSelector(state).get('pk')).toBe(16);
                expect(modelSelector(state).get('white')).toBe(true);
                expect(modelSelector(state).get('gray')).toBe('shades');
            });

            it('ignores keys not on the white list', () => {
                expect(modelSelector(state).get('black')).toBeUndefined();
            });

            it('triggers a change if a key on the whitelist changes', () => {
                const state2 = state.setIn(['i', 16, 'gray'], 'overcast');
                expect(modelSelector(state2).get('gray')).toBe('overcast');
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('does not trigger a change if a key not on the whitelist changes', () => {
                const state2 = state.setIn(['i', 16, 'black'], 'as night');
                expect(modelSelector(state2)).toBe(modelSelector(state));
                expect(modelSelector.recomputations()).toBe(1);
            });
        });

        describe('with a blacklist', () => {
            beforeEach(() => {
                modelSelector = createModelSelectorCreator('i', {blacklist: ['gray', 'black']})(16);
                modelSelector(state);
            });

            it('fetches keys on the white list', () => {
                expect(modelSelector(state).get('pk')).toBe(16);
                expect(modelSelector(state).get('white')).toBe(true);
            });

            it('ignores keys not on the white list', () => {
                expect(modelSelector(state).get('gray')).toBeUndefined();
                expect(modelSelector(state).get('black')).toBeUndefined();
            });

            it('triggers a change if a key not on the blacklist changes', () => {
                const state2 = state.setIn(['i', 16, 'white'], 'and pure');
                expect(modelSelector(state2).get('white')).toBe('and pure');
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('does not trigger a change if a key on the blacklist changes', () => {
                const state2 = state.setIn(['i', 16, 'black'], 'as night');
                expect(modelSelector(state2)).toBe(modelSelector(state));
                expect(modelSelector.recomputations()).toBe(1);
            });
        });

        it('returns an empty object if the model is not in the state', () => {
            modelSelector = createModelSelectorCreator('a')(123);
            expect(modelSelector(state).toJS()).toEqual({});
        });
    });
});
