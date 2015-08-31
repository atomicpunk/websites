function Note(midi) {
	var self = this;
	this.subtype = midi.subtype
	this.channel = midi.channel
	this.key = midi.param1
	this.volume = midi.param2

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

	function init() {
		self.notes[0] = new Note(midi);
	}
	init();
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
		for(var i = 0; (i < m.length) && (m[i].playTime < 9000); i++) {
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
		for(var i = 0; i < chords.length; i++)
			chords[i].print();
	}
}

function onload() {
	"use strict";
}
$(document).ready(onload);
