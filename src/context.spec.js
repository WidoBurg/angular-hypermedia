'use strict';

describe('ResourceContext', function () {
  beforeEach(module('hypermedia'));


  // Setup

  var $httpBackend, ResourceContext, context, resource;

  beforeEach(inject(function (_$httpBackend_, _ResourceContext_) {
    $httpBackend = _$httpBackend_;
    ResourceContext = _ResourceContext_;
    context = new ResourceContext();
    resource = context.get('http://example.com');
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });


  // Tests

  it('creates unique resources', function () {
    expect(context.get('http://example.com')).toBe(resource);
    expect(context.get('http://example.com/other')).not.toBe(resource);
  });

  it('copies resources from another context', function () {
    resource.$links.profile = 'http://example.com/profile';
    resource.name = 'John';

    var context2 = new ResourceContext();
    var resource2 = context2.copy(resource);

    expect(resource2).not.toBe(resource);
    expect(resource2.$uri).toBe(resource.$uri);
    expect(resource2.name).toBe('John');
    expect(resource2.$links.profile).toBe('http://example.com/profile');
  });

  it('performs HTTP GET requests', function () {
    var promiseResult = null;
    context.httpGet(resource).then(function (result) { promiseResult = result; });
    $httpBackend.expectGET(resource.$uri, {'Accept': 'application/json'})
        .respond('{"name": "John"}', {'Content-Type': 'application/json'});
    $httpBackend.flush();
    expect(promiseResult).toBe(resource);
    expect(resource.name).toBe('John');
    expect(resource.$syncTime / 10).toBeCloseTo(Date.now() / 10, 0);
  });

  it('converts content type profile parameter to link', function () {
    var promiseResult = null;
    context.httpGet(resource).then(function (result) { promiseResult = result; });
    $httpBackend.expectGET(resource.$uri, {'Accept': 'application/json'})
        .respond('{"name": "John"}', {'Content-Type': 'application/json; profile="http://example.com/profile"'});
    $httpBackend.flush();
    expect(promiseResult).toBe(resource);
    expect(resource.name).toBe('John');
    expect(resource.$links.profile).toEqual({href: 'http://example.com/profile'});
    expect(resource.$syncTime / 10).toBeCloseTo(Date.now() / 10, 0);
  });

  it('performs HTTP PUT requests', function () {
    var promiseResult = null;
    context.httpPut(resource).then(function (result) { promiseResult = result; });
    $httpBackend.expectPUT(resource.$uri, {},
          {'Accept': 'application/json, text/plain, */*', 'Content-Type': 'application/json'})
        .respond(204);
    $httpBackend.flush();
    expect(promiseResult).toBe(resource);
    expect(resource.$syncTime / 10).toBeCloseTo(Date.now() / 10, 0);
  });

  it('performs HTTP DELETE requests', function () {
    var promiseResult = null;
    resource.$syncTime = 1;
    context.httpDelete(resource).then(function (result) { promiseResult = result; });
    $httpBackend.expectDELETE(resource.$uri).respond(204);
    $httpBackend.flush();
    expect(promiseResult).toBe(resource);
    expect(resource.$syncTime).toBeNull();
  });

  it('performs HTTP POST requests', function () {
    var promiseResult = null;
    resource.$syncTime = 1;
    var promise = context.httpPost(resource, 'Test', {'Accept': '*/*', 'Content-Type': 'text/plain'});
    promise.then(function (result) { promiseResult = result; });
    $httpBackend.expectPOST(resource.$uri, 'Test', {'Accept': '*/*', 'Content-Type': 'text/plain'}).respond(204);
    $httpBackend.flush();
    expect(promiseResult.status).toBe(204);
    expect(resource.$syncTime).toBe(1);
  });

  it('performs HTTP POST requests without headers', function () {
    var promiseResult = null;
    resource.$syncTime = 1;
    var promise = context.httpPost(resource, 'Test');
    promise.then(function (result) { promiseResult = result; });
    $httpBackend.expectPOST(resource.$uri, 'Test').respond(204);
    $httpBackend.flush();
    expect(promiseResult.status).toBe(204);
    expect(resource.$syncTime).toBe(1);
  });

  it('counts the number of busy requests', function () {
    expect(ResourceContext.busyRequests).toBe(0);
    context.httpPut(resource);
    expect(ResourceContext.busyRequests).toBe(1);
    context.httpPut(resource);
    expect(ResourceContext.busyRequests).toBe(2);
    $httpBackend.whenPUT(resource.$uri).respond(204);
    $httpBackend.flush();
    expect(ResourceContext.busyRequests).toBe(0);
  });
});