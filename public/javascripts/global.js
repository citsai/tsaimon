// DOM Ready =============================================================
$(document).ready(function() {

	setInterval(function(){
		if (!document.getElementById('pause').checked) {
			// Get current status panel
			updateStatus();
		}
	},5000);

	setInterval(function(){
		if (!document.getElementById('pause').checked) {
			// Get chart
			updateChart();
		}
	},15000);

	//Change SP on click
	$('#btnSPNew').on('click',function(){
//		alert("I clicked on SP button");
		changeSP();
	});

});

// Functions =============================================================

//*************************
// Go get data and display it
//*************************
function updateStatus() {
	$.get('/users/updateStatus',function(data) {
//		console.log('received at global:',data);
		SP0 = data.SP;
		var dehum0 = (data.Dehum === "true"); // need top convert from string to boolean
		T20 = data.T2;
		T3a0 = data.T3a;
		T3b0 = data.T3b;
		T40 = data.T4;
		T50 = data.T5;	
		EEV0 = data.EEV;
		Mode0 = data.Mode;
		Flow0 = data.Flow;
		Volt0 = data.Volt;
		Amp0 = data.Amp;
		Watt = Volt0 * Amp0;
		
		//Mode
		if (Mode0 === 0) {
			document.getElementById("inputHybrid").checked=true;
		}
		if (Mode0 == 1) {
			document.getElementById("inputStdElec").checked=true;
		}
		if (Mode0 == 2) {
			document.getElementById("inputHeatPump").checked=true;
		}
		if (Mode0 == 3) {
			document.getElementById("inputHighDemand").checked=true;
		}
		if (Mode0 == 4) {
			document.getElementById("inputVacation").checked=true;
		}
		//Heat
		$('#inputUE').prop('checked',data.UE);
		$('#inputLE').prop('checked',data.LE);
		$('#inputCOMP').prop('checked',data.Comp);
		$('#inputFAN').prop('checked',data.Fan);
		//Flow intepretation
		switch (Flow0) {
			case 0:
				flowStr='None';
				break;
			case 1:
				flowStr='Small';
				break;
			case 3:
				flowStr='Medium';
				break;
			case 7:
				flowStr='Large';
				break;
			default:
				flowstr='Error value = '+Flow0;
				break;
		}
		//write the status
		$('#checkDehumStat').prop('checked',dehum0);
		$('#T2').html(T20);
		$('#T3a').html(T3a0);
		$('#T3b').html(T3b0);
		$('#T4').html(T40);
		$('#T5').html(T50);
		$('#EEV').html(EEV0);
		$('#Flow').html(flowStr);
		$('#Volt').html(Volt0);
		$('#Amp').html(Amp0);
		$('#Mode').html(Mode0);
		$('#Watt').html(Watt);
		document.getElementById("inputSP").value = SP0;
	});
}


//***************
// Change Setpoint
//***************
function changeSP() {
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
	var SPNew = {
		SP: $('#inputSPNew').val(),
		Mode: modeEnt,
		SP0: SP0,
		Dehum: $('#checkDehum').prop('checked')
	};			
	$.post('users/changeSetPoint', SPNew);
}

//***************
// Get chart data
//***************
function updateChart() {
	$.get('/users/updateChart',function(data) {
		var fSP = [];
		var fT2 = [];
		var fT3a = [];
		var fT3b = [];
		var fT4 = [];
		var fT5 = [];
		var fEEV = [];
		var fUE = [];
		var fLE = [];
		var fCOMP = [];
		var fFAN = [];
		var fWatt = [];

		data.forEach(function(row) {
			now = row.TimeStamp;
			fSP.push([now, row.SP]);
			fT2.push([now, row.T2]);
			fT3a.push([now, row.T3a]);
			fT3b.push([now, row.T3b]);
			fT4.push([now, row.T4]);
			fT5.push([now, row.T5]);
			fEEV.push([now, row.EEV]);
			fUE.push([now, row.UE]);
			fLE.push([now, row.LE]);
			fCOMP.push([now, row.Comp*0.5]);
			fFAN.push([now, row.Fan*0.25]);
			fWatt.push([now, row.Volt*row.Amp]);

		});

		$(function () {
			Highcharts.setOptions({
				global: {
					useUTC:false
				}
			});

			$('#myChart2').highcharts({
				chart: {
					type: 'line',
					alignTicks: false
				},
				title: {
					text: moment().format('ll')
				},
				xAxis: {
					type: 'datetime'
				},
				yAxis: [{
					labels: {
						format: '{value}F'
					},
					title: {
						text: 'T3a, T3b, T5'
					},
				}, {// Secondary yAxis
					gridLineWidth: 0,
					title:  {
						text: 'EEV Position/Watt'
					},
					min: 0,
					max: 500,
					opposite: true
				}, {// Third yAxis
					gridLineWidth: 0,
					labels: {
						format: '{value}F'
					},
					title: {
						text: 'SP, T2, T4'
					},
					min: 50
				},{// Fourth yAxis
					gridLineWidth: 0,
					title:  {
						text: 'Heating Source On/Off'
					},
					min: 0,
					max: 4,
					opposite: true
				}],					
						
				tooltip:  {
					crosshairs: true,
					shared: true
				},
				plotOptions: {
					series:	{
						animation: false,
						fillOpacity: 0.2
					},
				},
				series: [{
					name: 'SP',
					yAxis: 2,
					color: 'orangered',
					data: fSP
					},{
					name: 'T2',
					yAxis: 2,
					color: 'orange',
					data: fT2
					},{
					name: 'T3a',
					color: 'blue',
					data: fT3a
					},{
					name: 'T3b',
					color: 'cyan',
					data: fT3b
					},{
					name: 'T4',
					color: 'red',
					yAxis: 2,
					data: fT4
					},{
					name: 'T5',
					color: 'olive',
					data: fT5
					},{
					name: 'EEV',
					yAxis: 1,
					color: 'grey',
					data: fEEV
					},{
					name: 'UE',
					yAxis: 3,
					color: '#FF0000',
					data: fUE,
					type: 'area'
					},{
					name: 'LE',
					yAxis: 3,
					color: '#FFFF00',
					data: fLE,
					type: 'area'
					},{
					name: 'COMP',
					yAxis: 3,
					color: '#40FF00',
					data: fCOMP,
					type: 'area'
					},{
					name: 'FAN',
					yAxis: 3,
					color: '#7FFFD4',
					data: fFAN,
					type: 'area'
					},{
					name: 'Watt',
					yAxis: 1,
					color: 'black',
					data: fWatt
				}]
			});
		});
	});
}
