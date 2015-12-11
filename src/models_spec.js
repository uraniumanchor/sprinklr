import {
    createRelationRetriever,
    createSingleRetrievalSelectorCreator,
    createMultiRetrievalSelectorCreator,
    createReverseRetrievalSelectorCreator,
    createModelSelectorCreator,
} from './models';
import Immutable from 'immutable';


describe('models selectors', () => {
    let state;
    beforeEach(() => {
        state = Immutable.fromJS({
            a: Immutable.Map()
                .set(1, Immutable.fromJS({
                    id: 1,
                    quux: 'hello',
                    b_id: 2,
                    c_id: 3,
                    d_ids: [5, 6],
                    e_ids: [7, 8, 9],
                })),
            b: Immutable.Map()
                .set(2, Immutable.fromJS({
                    id: 2,
                    name: 'foo',
                    f_id: 11,
                    g_ids: [12],
                })),
            c: Immutable.Map()
                .set(3, Immutable.fromJS({
                    id: 3,
                    bar: 'baz',
                    e_id: 7,
                }))
                .set(4, Immutable.fromJS({
                    id: 4,
                    yes: 'no'
                })),
            d: Immutable.Map()
                .set(5, Immutable.fromJS({
                    id: 5,
                    bye: 'good',
                    e_id: 7,
                }))
                .set(6, Immutable.fromJS({
                    id: 6,
                    bye: 'bad',
                    e_id: 8,
                })),
            e: Immutable.Map()
                .set(7, Immutable.fromJS({ id: 7 }))
                .set(8, Immutable.fromJS({ id: 8 }))
                .set(9, Immutable.fromJS({ id: 9 }))
                .set(10, Immutable.fromJS({ id: 10 })),
            f: Immutable.Map()
                .set(11, Immutable.fromJS({ id: 11, amazing: 'not at all' })),
            g: Immutable.Map()
                .set(12, Immutable.fromJS({ id: 12, gluten: 'free'})),
            h: Immutable.Map()
                .set(13, Immutable.fromJS({ id: 13, a_id: 1, rock: 'out'}))
                .set(14, Immutable.fromJS({ id: 14, a_id: 1, rock: 'hard'}))
                .set(15, Immutable.fromJS({ id: 15, a_id: 2, rock: 'all night'})),
            i: Immutable.Map()
                .set(16, Immutable.fromJS({ id: 16, white: true, gray: 'shades', black: false})),
        });

    });

    describe('createRelationRetriever', () => {
        let relationRetriever;
        describe('with a whiteList', () => {
            beforeEach(() => {
                relationRetriever = createRelationRetriever({model: 'a', whiteList: ['id', 'b_id']}, 1);
                relationRetriever(state);
            });

            it('fetches keys on the whitelist', () => {
                expect(relationRetriever(state).toJS().id).toBe(1);
                expect(relationRetriever(state).toJS().b_id).toBe(2);
            });

            it('ignores keys not on the whitelist', () => {
                expect(relationRetriever(state).toJS().quux).not.toBeDefined();
                expect(relationRetriever(state).toJS().c_id).not.toBeDefined();
                expect(relationRetriever(state).toJS().d_ids).not.toBeDefined();
                expect(relationRetriever(state).toJS().e_ids).not.toBeDefined();
            });

            it('triggers a change if a key on the whitelist changes', () => {
                const state2 = state.setIn(['a', 1, 'b_id'], 3);
                expect(relationRetriever(state2).toJS().b_id).toBe(3);
                expect(relationRetriever.recomputations()).toBe(2);
            });

            it('does not trigger a change if a key not on the whitelist changes', () => {
                const state2 = state.setIn(['a', 1, 'quux'], 'bye');
                expect(relationRetriever(state2)).toBe(relationRetriever(state));
                expect(relationRetriever.recomputations()).toBe(1);
            });
        });

        describe('with a blackList', () => {
            beforeEach(() => {
               relationRetriever = createRelationRetriever({model: 'a', blackList: ['id', 'b_id']}, 1);
               relationRetriever(state);
            });

            it('fetches keys not on the blacklist', () => {
                expect(relationRetriever(state).toJS().quux).toBe('hello');
                expect(relationRetriever(state).toJS().c_id).toBe(3);
                expect(relationRetriever(state).toJS().d_ids).toEqual([5, 6]);
                expect(relationRetriever(state).toJS().e_ids).toEqual([7, 8, 9]);
            });

            it('ignores keys on the blacklist', () => {
                expect(relationRetriever(state).toJS().id).not.toBeDefined();
                expect(relationRetriever(state).toJS().b_id).not.toBeDefined();
            });

            it('triggers a change if a key not on the blacklist changes', () => {
                const state2 = state.setIn(['a', 1, 'quux'], 'bye');
                expect(relationRetriever(state2).toJS().quux).toBe('bye');
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
                expect(singleSelector(state).toJS().bar).toBe('baz');
                expect(singleSelector.recomputations()).toBe(1);
            });

            it('recalculates if the relation on the original changes', () => {
                const state2 = state.setIn(['a', 1, 'c_id'], 4);
                expect(singleSelector(state2).toJS().yes).toBe('no');
                expect(singleSelector.recomputations()).toBe(2);
            });

            it('recalculates if one of the models pointed to by the relation changes', () => {
                const state2 = state.setIn(['c', 3, 'bar'], 'buzz');
                expect(singleSelector(state2).toJS().bar).toBe('buzz');
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
                    const modelSelector = createModelSelectorCreator('c', [{ field: 'e', model: 'e', field_id: 'e_id'}])(id);
                    return state => {
                        return modelSelector(state);
                    };
                };
                singleSelector = createSingleRetrievalSelectorCreator('a', {field: 'c', model: 'c', field_id: 'c_id', selectorCreator: complexSelector})(1);
                singleSelector(state);
            });

            it('hydrates the relation', () => {
                expect(singleSelector(state).toJS().bar).toBe('baz');
                expect(singleSelector(state).toJS().e.id).toBe(7);
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
                expect(multiSelector(state).toJS()[0].bye).toBe('good');
                expect(multiSelector(state).toJS()[1].bye).toBe('bad');
                expect(multiSelector(state).toJS().length).toBe(2);
                expect(multiSelector.recomputations()).toBe(1);
            });

            it('recalculates if the relation on the original changes', () => {
                const state2 = state.updateIn(['a', 1, 'd_ids'], list => list.pop());
                expect(multiSelector(state2).toJS().length).toBe(1);
                expect(multiSelector.recomputations()).toBe(2);
            });

            it('recalculates if one of the models pointed to by the relation changes', () => {
                const state2 = state.setIn(['d', 5, 'bye'], 'maybe');
                expect(multiSelector(state2).toJS()[0].bye).toBe('maybe');
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
                    const modelSelector = createModelSelectorCreator('d', [{ field: 'e', model: 'e', field_id: 'e_id'}])(id);
                    return state => {
                        return modelSelector(state);
                    };
                };
                multiSelector = createMultiRetrievalSelectorCreator('a', {field: 'd', model: 'd', field_id: 'd_ids', selectorCreator: complexSelector})(1);
                multiSelector(state);
            });

            it('hydrates the relation', () => {
                expect(multiSelector(state).toJS()[0].e.id).toBe(7);
                expect(multiSelector(state).toJS()[1].e.id).toBe(8);
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
                expect(reverseSelector(state).toJS().length).toBe(2);
                expect(reverseSelector(state).toJS()[0].rock).toBe('out');
                expect(reverseSelector(state).toJS()[1].rock).toBe('hard');
                expect(reverseSelector.recomputations()).toBe(1);
            });

            it('recalculates if an object is added', () => {
                const state2 = state.setIn(['h', 15], Immutable.fromJS({id: 15, rock: 'solid', a_id: 1}));
                expect(reverseSelector(state2).toJS().length).toBe(3);
                expect(reverseSelector(state2).toJS()[2].rock).toBe('solid');
                expect(reverseSelector.recomputations()).toBe(2);
            });

            it('recalculates if an object is deleted', () => {
                const state2 = state.deleteIn(['h', 14]);
                expect(reverseSelector(state2).toJS().length).toBe(1);
                expect(reverseSelector.recomputations()).toBe(2);
            });

            it('recalculates if an object is moved', () => {
                const state2 = state.setIn(['h', 14, 'a_id'], 2);
                expect(reverseSelector(state2).toJS().length).toBe(1);
                expect(reverseSelector.recomputations()).toBe(2);
            });

            it('recalculates if an object is changed', () => {
                const state2 = state.setIn(['h', 13, 'rock'], 'on');
                expect(reverseSelector(state2).toJS()[0].rock).toBe('on');
                expect(reverseSelector.recomputations()).toBe(2);
            });

            it('does not recalculate if an unrelated object is added', () => {
                const state2 = state.setIn(['h', 16], Immutable.fromJS({id: 16, rock: 'all night', a_id: 2}));
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
                const subSelectorCreator = createModelSelectorCreator('b',
                    [{field: 'f', model: 'f', field_id: 'f_id'}],
                    [{field: 'g', model: 'g', field_id: 'g_ids'}]
                );

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

                modelSelector = createModelSelectorCreator('a', singleRelations, multiRelations, reverseRelations)(1);
                modelSelector(state);
            });

            it('hydrates a single model', () => {
                expect(modelSelector(state).toJS().quux).toBe('hello');
                expect(modelSelector(state).toJS().b.name).toBe('foo');
                expect(modelSelector(state).toJS().b.f.amazing).toBe('not at all');
                expect(modelSelector(state).toJS().b.g.length).toBe(1);
                expect(modelSelector(state).toJS().b.g[0].gluten).toBe('free');
                expect(modelSelector(state).toJS().c.bar).toBe('baz');
                expect(modelSelector(state).toJS().d.length).toBe(2);
                expect(modelSelector(state).toJS().d[0].bye).toBe('good');
                expect(modelSelector(state).toJS().e.length).toBe(3);
                expect(modelSelector(state).toJS().e[1].id).toBe(8);
                expect(modelSelector(state).toJS().h_set.length).toBe(2);
                expect(modelSelector(state).toJS().h_set[0].rock).toBe('out');
                expect(modelSelector(state)).toBe(modelSelector(state));
                expect(modelSelector.recomputations()).toBe(1);
            });

            it('changing the model triggers a change', () => {
                const state2 = state.setIn(['a', 1, 'quux'], 'bye');
                expect(modelSelector(state2).toJS().quux).toBe('bye');
                expect(modelSelector(state2)).toBe(modelSelector(state2));
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('no-op on the model does not trigger a change', () => {
                modelSelector(state.setIn(['a', 1, 'quux'], 'hello'));
                expect(modelSelector.recomputations()).toBe(1);
            });

            it('changing a single relation triggers a change', () => {
                const state2 = state.setIn(['a', 1, 'c_id'], 4);
                expect(modelSelector(state2).toJS().c.yes).toBe('no');
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('adding to a multi relation triggers a change', () => {
                const state2 = state.updateIn(['a', 1, 'e_ids'], list => list.push(10));
                expect(modelSelector(state2).toJS().e.length).toBe(4);
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('removing from a multi relation triggers a change', () => {
                const state2 = state.updateIn(['a', 1, 'e_ids'], list => list.pop());
                expect(modelSelector(state2).toJS().e.length).toBe(2);
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('adding a reverse relation triggers a change', () => {
                const state2 = state.setIn(['h', 15], Immutable.fromJS({id: 15, rock: 'solid', a_id: 1}));
                expect(modelSelector(state2).toJS().h_set.length).toBe(3);
                expect(modelSelector(state2).toJS().h_set[2].rock).toBe('solid');
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('deleting a reverse relation triggers a change', () => {
                const state2 = state.deleteIn(['h', 14]);
                expect(modelSelector(state2).toJS().h_set.length).toBe(1);
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('moving a reverse relation triggers a change', () => {
                const state2 = state.setIn(['h', 14, 'a_id'], 2);
                expect(modelSelector(state2).toJS().h_set.length).toBe(1);
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('changing a singly related model triggers a change', () => {
                const state2 = state.setIn(['b', 2, 'name'], 'bar');
                expect(modelSelector(state2).toJS().b.name).toBe('bar');
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('changing a deeply singly related model triggers a change', () => {
                const state2 = state.setIn(['f', 11, 'amazing'], 'absolutely');
                expect(modelSelector(state2).toJS().b.f.amazing).toBe('absolutely');
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
                expect(modelSelector(state2).toJS().d[0].bye).toBe('maybe');
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('changing a deeply multi related model triggers a change', () => {
                const state2 = state.setIn(['g', 12, 'gluten'], 'lots');
                expect(modelSelector(state2).toJS().b.g[0].gluten).toBe('lots');
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
                expect(modelSelector(state2).toJS().h_set[0].rock).toBe('on');
                expect(modelSelector.recomputations()).toBe(2);
            });
        });

        describe('with a whitelist', () => {
            beforeEach(() => {
                modelSelector = createModelSelectorCreator('i', [], [], [], ['id', 'white', 'gray'])(16);
                modelSelector(state);
            });

            it('fetches keys on the white list', () => {
                expect(modelSelector(state).toJS().id).toBe(16);
                expect(modelSelector(state).toJS().white).toBe(true);
                expect(modelSelector(state).toJS().gray).toBe('shades');
            });

            it('ignores keys not on the white list', () => {
                expect(modelSelector(state).toJS().black).toBeUndefined();
            });

            it('triggers a change if a key on the whitelist changes', () => {
                const state2 = state.setIn(['i', 16, 'gray'], 'overcast');
                expect(modelSelector(state2).toJS().gray).toBe('overcast');
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
                modelSelector = createModelSelectorCreator('i', [], [], [], null, ['gray', 'black'])(16);
                modelSelector(state);
            });

            it('fetches keys on the white list', () => {
                expect(modelSelector(state).toJS().id).toBe(16);
                expect(modelSelector(state).toJS().white).toBe(true);
            });

            it('ignores keys not on the white list', () => {
                expect(modelSelector(state).toJS().gray).toBeUndefined();
                expect(modelSelector(state).toJS().black).toBeUndefined();
            });

            it('triggers a change if a key not on the blacklist changes', () => {
                const state2 = state.setIn(['i', 16, 'white'], 'and pure');
                expect(modelSelector(state2).toJS().white).toBe('and pure');
                expect(modelSelector.recomputations()).toBe(2);
            });

            it('does not trigger a change if a key on the blacklist changes', () => {
                const state2 = state.setIn(['i', 16, 'black'], 'as night');
                expect(modelSelector(state2)).toBe(modelSelector(state));
                expect(modelSelector.recomputations()).toBe(1);
            });
        });
    });
});
