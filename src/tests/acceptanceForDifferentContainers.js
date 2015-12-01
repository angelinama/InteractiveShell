var assert = require('chai').assert;
var http = require('http');
var mathServer = require('../lib/index.js');
var request = require('supertest');
var jsdom = require("jsdom");
var fs = require('fs');

process.env.NODE_ENV = 'test';

describe.skip('Acceptance test for all containers', function () {
    var port = 8006;
    var server;
    var jquery;
    var containers = ['LocalContainerManager', 'sudoDockerContainers', 'sshDockerContainers'];
    request = request('http://localhost:' + port);
    jquery = fs.readFileSync(__dirname + "/../../public/public-common/jquery-ui-1.10.2.custom/js/jquery-1.9.1.js", "utf-8");

    for (var container in containers) {
        before(function (done) {
            server = mathServer.MathServer({
                port: port,
                CONTAINERS: './' + containers[container] + '.js'
            });
            server.listen();
            done();
        });

        after(function (done) {
            server.close();
            done();
        });

        describe('As basic behavior for container ' + containers[container], function () {
            it('should show the title', function (done) {
                request.get('/').expect(200).end(function (error, result) {
                    jsdom.env(
                        result.text,
                        {src: [jquery]},
                        function (errors, window) {
                            var title = window.$("title").text();
                            assert.match(title, /\s*Macaulay2\s*/);
                            done();
                        }
                    );
                });
            });
        });
    }
});
