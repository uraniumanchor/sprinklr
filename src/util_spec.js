import { flatToImmutable } from './util';

const state = {
    model: {
        1: {
            foo: 'bar',
        }
    }
};

describe('util', () => {
    let subject;
    describe('#flatToImmutable', () => {
        describe('with numericIds true', () => {
            beforeEach(() => {
                subject = flatToImmutable(state);
            });

            it('transforms string-numeric keys into a numeric keys', () => {
                expect(subject.getIn(['model', 1, 'foo'])).toBe('bar');
                expect(subject.getIn(['model', '1'])).toBeUndefined();
            });
        });

        describe('with numericIds false', () => {
            beforeEach(() => {
                subject = flatToImmutable(state, false);
            });

            it('does not transform string-numeric keys', () => {
                expect(subject.getIn(['model', '1', 'foo'])).toBe('bar');
                expect(subject.getIn(['model', 1])).toBeUndefined();
            });
        });
    });
})
