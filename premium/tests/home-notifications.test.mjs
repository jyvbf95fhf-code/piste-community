import test from 'node:test';
import assert from 'node:assert/strict';
import {ScreenHeader} from '../src/components.mjs';

test('existing header bell links to the center and displays unread count',()=>{
 const html=ScreenHeader('Alex','A',true,3);
 assert.match(html,/href="\/notifications"/);assert.match(html,/aria-label="Notifications, 3 non lues"/);assert.match(html,/>3<\/span>/);
});
