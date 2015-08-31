/*
 * Copyright (c) 2015, Todd Brandt.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */

/*   A   B   C   D   E   F   G */
var whitekeys = [
	 0,  2,  3,  5,  7,  8, 10, 
	12, 14, 15, 17, 19, 20, 22,
	24, 26, 27, 29, 31, 32, 34,
	36, 38, 39, 41, 43, 44, 46,
	48, 50, 51, 53, 55, 56, 58,
	60, 62, 63, 65, 67, 68, 70,
	72, 74, 75, 77, 79, 80, 82,
	84, 86, 87
];
/*  Bb  C#  Eb  F#  G# */
var blackkeys = [
	 1,  4,  6,  9, 11,
	13, 16, 18, 21, 23,
	25, 28, 30, 33, 35,
	37, 40, 42, 45, 47,
	49, 52, 54, 57, 59,
	61, 64, 66, 69, 71,
	73, 76, 78, 81, 83,
	85
];

function Note(midi) {
	var self = this;
	this.hold = false;

	function html() {
		var color = '';
		if(self.hold)
			color = ' hold';
		var n = self.key - 21;
		var html = '';
		if(whitekeys.indexOf(n) >= 0) {
			var idx = whitekeys.indexOf(n);
			html = '<div class="wkey n'+idx+color+'"></div>';
		} else {
			var idx = blackkeys.indexOf(n);
			html = '<div class="bkey n'+idx+color+'"></div>';
		}
		return html;
	}
	this.html = html;

	function print() {
		var h = '';
		if(self.hold)
			h = ' (HOLD)';
		console.log(' '+self.subtype+' '+self.channel+' '+self.key+' '+self.volume+h);
	}
	this.print = print;

	function copy(obj) {
		self.subtype = obj.subtype
		self.channel = obj.channel
		self.key = obj.key
		self.volume = obj.volume
		self.hold = true;
	}
	this.copy = copy;

	function init() {
		if(!midi)
			return;
		self.subtype = midi.subtype
		self.channel = midi.channel
		self.key = midi.param1
		self.volume = midi.param2
	}
	init();
}

function Chord(imidi) {
	var self = this;
	this.notes = [];
	this.note_ons = {};
	this.note_offs = {};

	function addNote(midi) {
		if(self.time == midi.playTime) {
			if(midi.subtype == 9) {
				self.notes[self.notes.length] = new Note(midi);
				self.note_ons[midi.param1] = true;
			} else {
				self.note_offs[midi.param1] = true;
			}
			return true;
		}
		return false;
	}
	this.addNote = addNote;

	function holdNote(note) {
		var n = new Note();
		n.copy(note);
		self.notes[self.notes.length] = n;
	}
	this.holdNote = holdNote;

	function addHold(next) {
		for(var i = 0; i < self.notes.length; i++) {
			var n = self.notes[i];
			if(!(n.key in next.note_offs) && !(n.key in next.note_ons)) {
				next.holdNote(n);
			}
		}
	}
	this.addHold = addHold;

	function print() {
		console.log('time = '+self.time);
		for(var i = 0; i < self.notes.length; i++)
			self.notes[i].print();
		for(var i in self.note_offs)
			console.log('OFF: '+i);
	}
	this.print = print;

	function htmlPush(elem) {
		var html = '<div class=chord><div class="keyboard"></div>';
		for(var i = 0; i < self.notes.length; i++)
			html += self.notes[i].html();
		html += '</div>';
		$(elem).append(html);
	}
	this.htmlPush = htmlPush;

	function init() {
		self.time = imidi.playTime
		self.addNote(imidi);
	}
	init();
}

function showScore(data) {
	for(var i = 0; i < data.length; i++) {
		data[i].htmlPush('#score');
	}
}

function loadMidiFile(file) {
	var reader = new FileReader();
	reader.readAsArrayBuffer(file);
	reader.onloadend=function(event) {
		midiFile=new MIDIFile(event.target.result);
		var m=midiFile.getMidiEvents();
		/* subtype: 8 = off, 9 = on */
		var chords = [];
		for(var i = 0; i < m.length; i++) {
//			if(m[i].playTime > 9000)
//				break;
			if((m[i].subtype != 9) && (m[i].subtype != 8))
				continue;
			if(chords.length == 0) {
				/* if we get a note off first ignore it */
				if(m[i].subtype == 8)
					continue;
				chords[0] = new Chord(m[i]);
				continue;
			}
			if(chords[chords.length-1].addNote(m[i]))
				continue;
			chords[chords.length] = new Chord(m[i]);
		}
		for(var i = 0; i < chords.length - 1; i++)
			chords[i].addHold(chords[i+1]);
		showScore(chords);
	}
}

function localMidiFile(input) {
	$('#score').empty();
	loadMidiFile(input.files[0]);
}

function onload() {
	"use strict";
	var midifile = 'midi/beethoven/Sonata_Pathetique_2.mid';
	var xhr = new XMLHttpRequest();
	xhr.open('GET', midifile, true);
	xhr.responseType = 'blob';
	xhr.onload = function(e) {
		if (this.status == 200)
			loadMidiFile(this.response);
	};
	xhr.send();
}
$(document).ready(onload);
