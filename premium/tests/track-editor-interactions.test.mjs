import test from 'node:test';
import assert from 'node:assert/strict';
import {svgClientPointToMap} from '../src/track-editor-interactions.mjs';

test('map tap coordinates account for SVG letterboxing and stay inside the mock viewBox',()=>{
 const rect={left:10,top:20,width:360,height:360};
 assert.deepEqual(svgClientPointToMap({clientX:190,clientY:200,rect}),{x:180,y:150});
 assert.deepEqual(svgClientPointToMap({clientX:10,clientY:20,rect}),{x:0,y:0});
 assert.deepEqual(svgClientPointToMap({clientX:370,clientY:380,rect}),{x:360,y:300});
});

test('map coordinate conversion rejects missing or zero-sized touch geometry',()=>{
 assert.equal(svgClientPointToMap({clientX:10,clientY:10,rect:{left:0,top:0,width:0,height:0}}),null);
 assert.equal(svgClientPointToMap({clientX:10,clientY:10}),null);
});
