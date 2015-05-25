// DOM Ready =============================================================
$(document).ready(function() {
	//Change SP on click
	$('#btnEntrySubmit').on('click',function(){
		entrySubmit();
	});
	$('#btnClearSubmit').on('click',function(){
		clearSubmit();
	});
	// Get chart
	schedChart();
});

// Functions =============================================================

//***************
// Add Schedule Event
//***************
function entrySubmit() {
	// get the data
	SPEnt = $('#inputSP').val();
	switch ($('#selMode').val()) {
		case 'Hybrid':
			modeEnt = 0;
			break;
		case 'Heat Pump':
			modeEnt =  2;
			break;
		case 'High Demand':
			modeEnt = 3;
			break;
		case 'Standard Electric':
			modeEnt = 1;
			break;
		case 'Vacation':
			modeEnt = 4;
			break;
		default:
			modeEnt = "";
			break;
	}
	switch ($('#selDehum').val()) {
		case 'No Dehum':
			dehumEnt = 'false';  // use string for boolean
			break;
		case 'Yes Dehum':
			dehumEnt =  'true'; // use string instead of boolean
			break;
		default:
			dehumEnt = 'false'; // use string for boolean
			break;
	}
	dateTime = moment($('#inputDateTime').val()).valueOf();
	freq = $('#selFrequency').val();
	// Create data object
	switch (freq) {
		case 'One-time':
			multi = 1;
			timeStep = 0;
			break;
		case 'Daily':
			multi = 365;
			timeStep = 3600*24*1000; // 1 day in msecs
			break;
		case 'Weekly':
			multi = 52;
			timeStep= 3600*24*1000*7; // 1 week in msecs
			break;
		default:
			multi = 0;
			timeStep = 0;
			break;
	}
	// compile the list of schedule entries
	items = [];
	for (i = 0; i<multi; i++) {
		item = {'Time': dateTime+i*timeStep, 'SP': SPEnt, 'Mode': modeEnt, 'Dehum': dehumEnt};
		items.push(item);
	}
//	alert (JSON.stringify(items));
	// send it to the server for processing
	$.ajax({
		url: '/users/addSchedule',
		type: 'POST',
		dataType: 'JSON',
		data: JSON.stringify(items),
		contentType: 'application/json'
	});
}

//***************
//  Clear schedule data
//***************
function clearSubmit() {
	startClear = moment($('#inputStartClear').val()).valueOf();
	endClear = moment($('#inputEndClear').val()).valueOf();
	freq = $('#selClearFreq').val();
	//error checking
	// end datetime > start datetime?
	if (endClear<startClear) {
		alert('Please check start and end date');
		return false;
	}
	// if daily freq wth 24 hours?
	if (freq == 'Daily' && endClear>(startClear+3600*24*1000)) {
		alert('Start and End range must be within 1 day for Daily Clear');
		return false;
	}
	//if weekly freq within 1 week?
	if (freq == 'Weekly' && endClear>(startClear+7*3600*24*1000)) {
		alert('Start and End range must be within 1 week for Weekly Clear');
		return false;
	}
	// Create data object of time ranges for clearing
	switch (freq) {
		case 'One-time':
			multi = 1;
			timeStep = 0;
			break;
		case 'Daily':
			multi = 365;
			timeStep = 3600*24*1000; // 1 day in msecs
			break;
		case 'Weekly':
			multi = 52;
			timeStep= 3600*24*1000*7; // 1 week in msecs
			break;
		default:
			multi = 0;
			timeStep = 0;
			break;
	}
	// compile the list of clear schedule ranges
	items = [];
	for (i = 0; i<multi; i++) {
		item = {'startClear': startClear+i*timeStep, 'endClear': endClear+i*timeStep};
		items.push(item);
	}
//	alert (JSON.stringify(items));
	// send it to the server for processing
	$.ajax({
		url: '/users/clearSchedule',
		type: 'POST',
		dataType: 'JSON',
		data: JSON.stringify(items),
		contentType: 'application/json'
	});
}

//***************
// Get chart data
//***************
function schedChart() {
	$.get('/users/schedChart',function(data) {
		var fSP = [];
		var fMode = [];

		data.forEach(function(row) {
			now = row.Time;
/*
			switch (row.Mode) {
				case 0:
					SPColor = "color: 'yellow'";
					break;
				case 1:
					SPColor = "color: 'red'";
					break;
				case 2:
					SPColor = "color: 'green'";
					break;
				case 3:
					SPColor = "color: 'orange'";
					break;
				case 4:
					SPColor = "color: 'blue'";
					break;
			}
*/
			fSP.push([now, row.SP]);
			fMode.push([now, row.Mode]);
		});
		var modeLabels = ["Hybrid", "Std Elec", "Heat Pump", "High Demand", "Vacation"];

		$(function () {
			Highcharts.setOptions({
				global: {
					useUTC:false
				}
			});

			$('#myChart1').highcharts({
				chart: {
					type: 'line',
					alignTicks: false,
					zoomType: 'x',
					panning: true,
					panKey: 'shift'
				},
				title: {
					text: 'Schedule'
				},
				xAxis: {
					type: 'datetime'
				},
				yAxis: [{
					labels: {
						format: '{value}F'
					},
					title: {
						text: 'SP'
					},
				}, {// Secondary yAxis
					gridLineWidth: 0,
					title:  {
						text: 'Mode'
					},
					labels: {
						formatter: function() {
							return modeLabels[this.value];
						}
					},
					min: 0,
					max: 4,
					opposite: true,
					minTickInterval: 1, 

				}],					
						
				tooltip:  {
					crosshairs: true,
					shared: true
				},
				plotOptions: {
					series:	{
						animation: false,
						fillOpacity: 0.2
					}
				},
				series: [{
					name: 'SP',
					color: 'orange',
					step: 'left',
					data: fSP
					},{
					name: 'Mode',
					yAxis: 1,
					step: 'left',
					type: 'area',
					color: '#40FF00',
					data: fMode
				}]
			});
		});
	});
}
