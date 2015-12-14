import Cache from './cache';

describe('Cache', () => {
    let subject;
    beforeEach(() => {
        subject = new Cache({
            a: {
                b: {type: 'children', model: 'b', field: 'a'}
            },
            b: {
                a: {type: 'parent', model: 'a'}
            }
        });
    });

    describe('#selector', () => {
        it('returns the same generator when given the same arguments', () => {
            expect(subject.selector('a')).toBe(subject.selector('a'));
        });

        it('returns a different generator when given different arguments', () => {
            expect(subject.selector('a')).not.toBe(subject.selector('b'));
        });
    });

    describe('#size', () => {
        it('returns 0 when the cache is empty', () => {
            expect(subject.size()).toBe(0);
        });

        it('increases when given different sets of arguments', () => {
            subject.selector('a');
            subject.selector('b');
            expect(subject.size()).toBe(2);
        });

        it('does not increase when given the same arguments', () => {
            subject.selector('a');
            subject.selector('a');
            expect(subject.size()).toBe(1);
        });
    });

});
