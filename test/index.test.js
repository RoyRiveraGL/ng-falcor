// See mit-license.txt for license info

/* eslint-env mocha */

import ngFalcor from '../src';
import { create } from '../src';
import assert from 'assert';
import { Model } from 'falcor';

var $rootScope = {
  $evalAsync() {}
};

describe('ng-falcor', () => {

  describe('importing', () => {

    it('should import both in CJS and ES6', () => {
      const cjsModule = require('../src');
      assert.strictEqual(ngFalcor, cjsModule);
      assert.strictEqual(ngFalcor.create, cjsModule.create);
      assert.strictEqual(create, cjsModule.create);
      assert.strictEqual(typeof ngFalcor.create, 'function');
    });
  });

  describe('create', () => {

    it('should create', () => {
      create({});
    });
  });

  describe('factory', () => {

    it('should be a function', () => {
      const factory = create({});
      assert.strictEqual(typeof factory, 'function');
    });

    it('factory should inject root scope', () => {
      const factory = create({});
      assert.deepEqual(factory.$inject, ['$rootScope']);
    });
  });

  describe('ngf', () => {

    it('should be a function', () => {
      const factory = create({});
      const ngf = factory($rootScope);
      assert.strictEqual(typeof ngf, 'function');
    });

    it('getValue should be a function', () => {
      const factory = create({});
      const ngf = factory($rootScope);
      assert.strictEqual(typeof ngf.getValue, 'function');
    });

    it('getValue should return a thenable', () => {
      const factory = create({});
      const ngf = factory($rootScope);
      const thenable = ngf.getValue(['foo']);
      assert.strictEqual(typeof thenable.then, 'function');
    });

    it('should return undefined at first', () => {
      const factory = create({});
      const ngf = factory($rootScope);
      const val = ngf('foo');
      assert.strictEqual(val, undefined);
    });

    it('should accept a cache', () => {
      const factory = create({ cache: { foo: 1 } });
      factory($rootScope);
    });

    it('should return a value from cache', () => {
      const factory = create({ cache: { foo: 1 } });
      const ngf = factory($rootScope);
      const val = ngf('foo');
      assert.strictEqual(val, 1);
    });

    it('should return a value from cache multiple times', () => {
      const factory = create({ cache: { foo: 1 } });
      const ngf = factory($rootScope);
      let val = ngf('foo');
      assert.strictEqual(val, 1);
      val = ngf('foo');
      assert.strictEqual(val, 1);
    });

    it('should not accept path strings', () => {
      const factory = create({ cache: { foo: { bar: 2 } } });
      const ngf = factory($rootScope);
      const val = ngf('foo.bar');
      assert.strictEqual(val, undefined);
    });

    it('should accept path args', () => {
      const factory = create({ cache: { foo: { bar: 2 } } });
      const ngf = factory($rootScope);
      const val = ngf('foo', 'bar');
      assert.strictEqual(val, 2);
    });

    it('should follow refs', () => {
      var cache = {
        foo: { bar: { $type: 'ref', value: ['fiz', 'fuz'] } },
        fiz: { fuz: 3 }
      };
      const factory = create({ cache });
      const ngf = factory($rootScope);
      const val = ngf('foo', 'bar');
      assert.strictEqual(val, 3);
    });

    it('should accept a router', () => {
      var router = '/model.json';
      const factory = create({ router });
      factory($rootScope);
    });

    it('should invalidate', () => {
      const factory = create({ cache: { foo: 'x' } });
      const ngf = factory($rootScope);
      let val = ngf('foo');
      assert.strictEqual(val, 'x');
      ngf.invalidate('foo');
      val = ngf('foo');
      assert.strictEqual(val, undefined);
    });

    it('should set', () => {
      const factory = create();
      const ngf = factory($rootScope);
      return ngf.set({ path: 'foo', value: 'bar' }).then(() => {
        const val = ngf('foo');
        assert.strictEqual(val, 'bar');
      });
    });

    it('should withoutDataSource', async function() {
      const factory = create();
      const ngf = factory($rootScope);
      await ngf.set({ path: ['a'], value: 'b' });
      assert.strictEqual(ngf('a'), 'b');
      var m = ngf.withoutDataSource();
      assert.strictEqual(await m.getValue(['a']), 'b');
    });

    it('should use model as data source', async function() {
      const model = new Model({
        cache: { a: 'b' }
      });
      const source = model.asDataSource();
      const factory = create({ source });
      const ngf = factory($rootScope);
      assert.strictEqual(await ngf.getValue(['a']), 'b');
    });

    it('should not dupe calls to data source', async function() {
      let count = 0;
      const model = new Model({
        cache: { a: 'b' }
      });
      const source = model.asDataSource();
      source.call = function() {
        count++;
        return model.get('a'); // just need to return a modelresponse here.
      };
      const factory = create({ source });
      const ngf = factory($rootScope);
      await ngf.callModel('foo', ['a'], [], []);
      assert.strictEqual(count, 1);
    });

    // https://github.com/Netflix/falcor/issues/728
    it.skip('should not dupe calls to data source (2)', async function() {
      let count = 0;
      const sourceModel = new Model({ cache: { a: 'b' } });
      const source = sourceModel.asDataSource();
      source.call = function() {
        count++;
        const fakeResp = sourceModel.get('a');
        return fakeResp;
      };
      const model = new Model({ source });
      const resp = model.call('foo', ['baz'], [], []);
      await resp;
      await resp;
      assert.strictEqual(count, 1);
    });

    it('should have initial configuration', () => {
      const factory = create({ router: '/model.json' });
      const ngf = factory($rootScope);
      assert.strictEqual(ngf._config.router, '/model.json');
      assert(!!ngf._config._source, 'missing source');
    });

    it('should configure', () => {
      const factory = create();
      const ngf = factory($rootScope);
      ngf.configure({ router: '/model.json' });
      assert.strictEqual(ngf._config.router, '/model.json');
      assert(!!ngf._config._source, 'missing source');
    });

    it('should configure router', () => {
      const factory = create({ router: '/model.json' });
      const ngf = factory($rootScope);
      const oldSource = ngf._config._source;
      ngf.configure({ router: '/model2.json' });
      assert.strictEqual(ngf._config.router, '/model2.json');
      assert(oldSource !== ngf._config._source, 'wrong source');
    });

    it('should reconfigure', () => {
      const factory = create({ headers: { foo: 'bar' } });
      const ngf = factory($rootScope);
      ngf.reconfigure({ headers: { baz: 'qux' } });
      assert.deepEqual(ngf._config.headers, { foo: 'bar', baz: 'qux' });
    });

    it('should reconfigure set null', () => {
      const factory = create({ router: '/foo' });
      const ngf = factory($rootScope);
      ngf.reconfigure({ router: null });
      assert.strictEqual(ngf._config.router, undefined);
    });

    it('should reconfigure headers set null', () => {
      const factory = create({ headers: { foo: 'bar' } });
      const ngf = factory($rootScope);
      ngf.reconfigure({ headers: null });
      assert.strictEqual(ngf._config.headers, undefined);
    });

    it('should not keep ref to cache', () => {
      const factory = create({ cache: { foo: 'bar' } });
      const ngf = factory($rootScope);
      assert.strictEqual(ngf._config.cache, undefined);
    });
  });

  describe('two-way binding', () => {

    it('should get', () => {
      const factory = create({ cache: { foo: 'bar' }});
      const ngf = factory($rootScope);
      const tw = ngf.twoWay('foo');
      const val = tw();
      assert.strictEqual(val, 'bar');
    });

    it('should set', () => {
      const factory = create({ cache: { foo: 'bar' }});
      const ngf = factory($rootScope);
      const tw = ngf.twoWay('foo');
      tw('baz');
      const val = ngf('foo');
      assert.strictEqual(val, 'baz');
    });

    it('should set and get', () => {
      const factory = create();
      const ngf = factory($rootScope);
      const tw = ngf.twoWay('foo');
      tw('baz');
      const val = tw();
      assert.strictEqual(val, 'baz');
    });

    it('should get and set', () => {
      const factory = create();
      const ngf = factory($rootScope);
      const tw = ngf.twoWay('foo');
      let val = tw();
      assert.strictEqual(val, undefined);
      tw('baz');
      val = tw();
      assert.strictEqual(val, 'baz');
    });
  });
});
