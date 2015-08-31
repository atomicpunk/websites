
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
	this.subtype = midi.subtype
	this.channel = midi.channel
	this.key = midi.param1
	this.volume = midi.param2

	function html() {
		var n = self.key - 21;
		var html = '';
		if(whitekeys.indexOf(n) >= 0) {
			var idx = whitekeys.indexOf(n);
			html = '<div class="wkey n'+idx+'"></div>';
		} else {
			var idx = blackkeys.indexOf(n);
			html = '<div class="bkey n'+idx+'"></div>';
		}
		return html;
	}
	this.html = html;

	function print() {
		console.log(' '+self.subtype+' '+self.channel+' '+self.key+' '+self.volume);
	}
	this.print = print;
}

function Chord(midi) {
	var self = this;
	this.time = midi.playTime
	this.notes = [];

	function add(midi) {
		if(self.time == midi.playTime) {
			self.notes[self.notes.length] = new Note(midi);
			return true;
		}
		return false;
	}
	this.add = add;

	function print() {
		console.log('time = '+self.time);
		for(var i = 0; i < self.notes.length; i++)
			self.notes[i].print();
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
		self.notes[0] = new Note(midi);
	}
	init();
}

function showScore(data) {
	for(var i = 0; i < data.length; i++) {
		data[i].htmlPush('#score');
	}
}

function readMidiFile(input) {
	console.log(input.files[0]);
	var reader = new FileReader();
	reader.readAsArrayBuffer(input.files[0]);
	reader.onloadend=function(event) {
		midiFile=new MIDIFile(event.target.result);
		var m=midiFile.getMidiEvents();
		/* subtype: 8 = off, 9 = on */
		var chords = [];
		for(var i = 0; i < m.length; i++) {
			if(m[i].subtype != 9)
				continue;
			if(chords.length == 0) {
				chords[0] = new Chord(m[i]);
				continue;
			}
			if(chords[chords.length-1].add(m[i]))
				continue;
			chords[chords.length] = new Chord(m[i]);
		}
		showScore(chords);
	}
}

function onload() {
	"use strict";
}
$(document).ready(onload);
