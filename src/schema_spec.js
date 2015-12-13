import Immutable from 'immutable';

import schema from './schema';
import { flatToImmutable } from './util';

const testSchema = {
    'donation_tracker.donor': {
        donation_set: { type: 'children', model: 'donation_tracker.donation', field: 'donor' },
        runner: { type: 'friend', model: 'donation_tracker.runner', field: 'donor'},
        prizewinner_set: { type: 'children', model: 'donation_tracker.prizewinner', field: 'winner' },
    },
    'donation_tracker.event': {
        bids: { type: 'children', model: 'donation_tracker.bid', field: 'event' },
        donation_set: { type: 'children', model: 'donation_tracker.donation', field: 'event' },
    },
    'donation_tracker.bid': {
        event: { type: 'parent', model: 'donation_tracker.event' },
        speedrun: { type: 'parent', model: 'donation_tracker.speedrun', blank: true},
        parent: { type: 'tree', model: 'donation_tracker.bid', blank: true },
        options: { type: 'tree_children', model: 'donation_tracker.bid', field: 'parent' },
        biddependency: { type: 'tree', model: 'donation_tracker.bid', blank: true },
        dependent_bids: { type: 'tree_children', model: 'donation_tracker.bid', field: 'biddependency' },
        bids: { type: 'children', model: 'donation_tracker.donationbid', field: 'bid' },
    },
    'donation_tracker.donationbid': {
        bid: { type: 'parent', model: 'donation_tracker.bid', reverse: 'bids' },
        donation: { type: 'parent', model: 'donation_tracker.donation' },
    },
    'donation_tracker.bidsuggestion': {
        bid: { type: 'parent', model: 'donation_tracker.bid' }
    },
    'donation_tracker.donation': {
        donor: { type: 'parent', model: 'donation_tracker.donor', reverse: 'donation_set' },
        event: { type: 'parent', model: 'donation_tracker.event', reverse: 'donation_set' },
        bids: { type: 'children', model: 'donation_tracker.donationbid', field: 'donation' }
    },
    'donation_tracker.speedrun': {
        event: { type: 'parent', model: 'donation_tracker.event' },
        bids: { type: 'children', model: 'donation_tracker.bid', field: 'speedrun' },
        runners: { type: 'friends', model: 'donation_tracker.runner' },
    },
    'donation_tracker.runner': {
        speedrun_set: { type: 'friends', model: 'donation_tracker.speedrun', field: 'runners' },
        donor: { type: 'friend', model: 'donation_tracker.donor', blank: true },
    },
    'donation_tracker.prize': {
        event: { type: 'parent', model: 'donation_tracker.event' },
        startrun: { type: 'parent', model: 'donation_tracker.speedrun', blank: true },
        endrun: { type: 'parent', model: 'donation_tracker.speedrun', blank: true },
        winners: { type: 'children', model: 'donation_tracker.prizewinner' },
    },
    'donation_tracker.prizewinner': {
        prize: { type: 'parent', model: 'donation_tracker.prize' },
        winner: { type: 'parent', model: 'donation_tracker.donor' },
    },
};

const state = flatToImmutable({
    'donation_tracker.event': {
        1: {
            name: 'Test Event 1'
        },
        2: {
            name: 'Test Event 2'
        },
    },
    'donation_tracker.speedrun': {
        1: {
            event: 1,
            runners: [1],
            name: 'Test Run 1',
        },
        2: {
            event: 2,
            runners: [2, 3],
            name: 'Test Run 2',
        },
    },
    'donation_tracker.runner': {
        1: {
            name: 'Test Runner 1',
            donor: 1,
        },
        2: {
            name: 'Test Runner 2',
        },
        3: {
            name: 'Test Runner 3',
        },
    },
    'donation_tracker.donor': {
        1: {
            name: 'Test Donor 1',
            email: 'donor1@example.com',
        },
        2: {
            name: 'Test Donor 2',
            email: 'donor2@example.com',
        },
    },
    'donation_tracker.donation': {
        1: {
            event: 1,
            donor: 1,
            amount: '5.00',
        },
        2: {
            event: 1,
            donor: 2,
            amount: '10.00',
        },
    },
    'donation_tracker.bid': {
        1: {
            event: 1,
            speedrun: 1,
            target: false,
            name: 'Test Choice 1',
        },
        2: {
            event: 1,
            speedrun: 1,
            parent: 1,
            target: true,
            name: 'Test Option 1',
        },
        3: {
            event: 1,
            speedrun: 1,
            parent: 1,
            target: true,
            name: 'Test Option 2',
        },
        4: {
            event: 1,
            speedrun: 1,
            target: true,
            name: 'Test Goal 1',
        },
        5: {
            event: 1,
            speedrun: 1,
            target: true,
            biddependency: 4,
            name: 'Test Dependent Goal 1',
        }
    },
    'donation_tracker.donationbid': {
        1: {
            bid: 2,
            donation: 1,
            amount: '5.00',
        },
    },
});

describe('schema', () => {
    let selector;
    describe('simple tests', () => {
        describe('parent type with two child types', () => {
            const testSchema = {
                'a.tree': {
                    branches: {type: 'children', model: 'a.branch', field: 'tree'},
                    roots: {type: 'children', model: 'a.root', field: 'tree'},
                },
                'a.branch': {
                    tree: {type: 'parent', model: 'a.tree'},
                },
                'a.root': {
                    tree: {type: 'parent', model: 'a.tree'},
                }
            };

            const state = flatToImmutable({
                'a.tree': {
                    1: { wood: 'oak' },
                    2: { wood: 'pine' },
                },
                'a.branch': {
                    1: {tree: 1},
                    2: {tree: 1},
                    3: {tree: 2},
                },
                'a.root': {
                    1: {tree: 1},
                    2: {tree: 1},
                    3: {tree: 1},
                    4: {tree: 2},
                },
            });

            describe('from the child', () => {
                beforeEach(() => {
                    selector = schema.createSelectorFromSchemaCreator('a.branch', testSchema)(1);
                });

                it('retrieves the parent', () => {
                    expect(selector(state).getIn(['tree', 'wood'])).toBe('oak');
                });

                it('retrieves cousins', () => {
                    expect(selector(state).getIn(['tree', 'roots'])).toBeDefined();
                });

                it('does not retrieve siblings', () => {
                    expect(selector(state).getIn(['tree', 'branches'])).toBeUndefined();
                });
            });

            describe('from the parent', () => {
                beforeEach(() => {
                    selector = schema.createSelectorFromSchemaCreator('a.tree', testSchema)(1);
                });

                it('retrieves the first child', () => {
                    expect(selector(state).get('branches').size).toBe(2);
                });

                it('retrieves the second child', () => {
                    expect(selector(state).get('roots').size).toBe(3);
                });

                it('does not retrieve itself recursively', () => {
                    expect(selector(state).get('roots').first().get('tree')).toBeUndefined();
                });
            });
        });

        describe('two multi related types with a shared child type', () => {
            const testSchema = {
                'a.restaurant': {
                    toppings: { type: 'friends', model: 'a.topping' },
                    pizzas: { type: 'children', model: 'a.pizza', field: 'restaurant' },
                },
                'a.pizza': {
                    restaurant: { type: 'parent', model: 'a.restaurant' },
                    toppings: { type: 'friends', model: 'a.topping' },
                }
            };

            const state = flatToImmutable({
                'a.restaurant': {
                    1: { name: 'Magic', toppings: [1, 2, 3] },
                    2: { name: 'Famous', toppings: [1, 2, 4] },
                },
                'a.topping': {
                    1: { name: 'Pepperoni' },
                    2: { name: 'Sausage' },
                    3: { name: 'Ham' },
                    4: { name: 'Pineapple' },
                },
                'a.pizza': {
                    1: { restaurant: 1, toppings: [1, 2]},
                },
            });

            describe('from the parent type', () => {
                beforeEach(() => {
                    selector = schema.createSelectorFromSchemaCreator('a.restaurant', testSchema)(1);
                });

                it("retrieves the children's toppings", () => {
                    expect(selector(state).get('pizzas').first().get('toppings').size).toBe(2);
                    expect(selector(state).get('pizzas').first().get('toppings').first().get('name')).toBeDefined();
                });
            });

            describe('from the child type', () => {
                beforeEach(() => {
                    selector = schema.createSelectorFromSchemaCreator('a.pizza', testSchema)(1);
                });

                it("retrieves the parent's toppings", () => {
                    expect(selector(state).getIn(['restaurant', 'toppings']).size).toBe(3);
                    expect(selector(state).getIn(['restaurant', 'toppings']).first().get('name')).toBeDefined();
                });

            });
        });

        describe('parent type with a child type that has a friend type', () => {
            const testSchema = {
                'a.parent': {
                    children: { type: 'children', model: 'a.child', field: 'parent' },
                },
                'a.child': {
                    parent: { type: 'parent', model: 'a.parent' },
                    vehicle: { type: 'friend', model: 'a.vehicle' },
                },
            };

            const state = flatToImmutable({
                'a.parent': {
                    1: { name: 'Dad' },
                },
                'a.child': {
                    1: { parent: 1, name: 'Son', vehicle: 1 },
                },
                'a.vehicle': {
                    1: { type: 'Car' },
                },
            });

            describe('from the parent type', () => {
                beforeEach(() => {
                    selector = schema.createSelectorFromSchemaCreator('a.parent', testSchema)(1);
                });

                it('retrieves the friend', () => {
                    expect(selector(state).get('children').first().getIn(['vehicle', 'type'])).toBe('Car');
                });
            });
        });
    });

    xdescribe('entering from a leaf', () => {
        beforeEach(() => {
            selector = schema.createSelectorFromSchemaCreator('donation_tracker.donationbid', testSchema)(1);
            selector(state);
        });

        it('traverses the tree', () => {
            console.log(JSON.stringify(selector(state), null, 1));
            expect(selector(state).toJS().donation.pk).toBe(1);
            expect(selector(state).toJS().donation.event.pk).toBe(1);
        });
    });

    xdescribe('entering from a midpoint', () => {
        beforeEach(() => {
            selector = schema.createSelectorFromSchemaCreator('donation_tracker.bid', testSchema)(2);
            selector(state);
        });

        it('traverses the tree', () => {
            console.log(JSON.stringify(selector(state), null, 1));
            expect(selector(state).toJS().event.pk).toBe(1);
            expect(selector(state).toJS().bids[0].pk).toBe(1);
        });
    });

    xdescribe('entering from a root', () => {
        beforeEach(() => {
            selector = schema.createSelectorFromSchemaCreator('donation_tracker.event', testSchema)(1);
            selector(state);
        });

        it('traverses the tree', () => {
            console.log(JSON.stringify(selector(state), null, 1));
            expect(selector(state).toJS().donation_set.length).toBe(2);
            expect(selector(state).toJS().bids.length).toBe(5);
        });
    });
});
