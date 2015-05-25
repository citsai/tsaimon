// DOM Ready =============================================================
$(document).ready(function() {
	//Send Email on click
	$('#btnEmail').on('click',function(){
		testEmail();
	});
	$('#btnChangeEmail').on('click',function(){
		changeEmail();
	});
	$('#btnSubmitAlert').on('click',function(){
		submitAlert();
	});
	alertLoad();
});

// Functions =============================================================
// send test email
function testEmail() {
	email = $('#inputEmail').val();
	if (email.indexOf('@') > -1 && email.indexOf('.') > -1) {
		var json = {newEmail: email};
		alert('test email sent to ' + $('#inputEmail').val());
		$.post('users/testMsg',json);
	} else {
		alert('email not valid');
	}
};

//Change email
function changeEmail() {
	email = $('#inputEmail').val();
	if (email.indexOf('@') > -1 && email.indexOf('.') > -1) {
		var json = {newEmail: email};
		alert('changing alert email to ' + $('#inputEmail').val());
		$.post('users/changeEmail',json);
	} else {
		alert('email not valid');
	}
};

// redraw and populate the emails and alerts that are active
function alertLoad() {
	//alert('reloading alert page');
	$.get('users/alertLoad',function(alertData) {
		//console.log(alertData);
		$('#inputEmail').val(alertData.email); 
		$('#checkEnergyOver').prop('checked',alertData.dayKwhrFlg);
		$('#inputKwhrLimit').val(alertData.dayKwhrLmt);
		$('#checkStandbyLow').prop('checked',alertData.dayStbyFlg);
		$('#inputStbyLimit').val(alertData.dayStbyLmt);
		$('#checkFault').prop('checked',alertData.errFlg);
		$('#checkModeChanged').prop('checked',alertData.modeChgFlg);
		$('#checkSPChanged').prop('checked',alertData.SPChgFlg);
		$('#checkElementUse').prop('checked',alertData.htrElmntFlg);
	});
};

//Change and apply alerts
function submitAlert() {
	// do some basic checking of inputs
	if ($('#inputKWhrLimit').val() < 0 || $('#inputKWhrLimit').val() > 100) {
		alert('Invalid Daily Energy Value.  Please check.');
		return;
	}
	if ($('#inputStbyLimit').val() < 0 || $('#inputStbyLimit').val() > 100) {
		alert('Invalid Standby time%.  Please check.');
		return;
	}
	// construct alert object
	var json = {
		dayKwhrFlg: $('#checkEnergyOver:checked').length, 
		dayKwhrLmt: $('#inputKwhrLimit').val(), 
		dayStbyFlg: $('#checkStandbyLow:checked').length, 
		dayStbyLmt: $('#inputStbyLimit').val(),
		modeChgFlg: $('#checkModeChanged:checked').length,
		SPChgFlg: $('#checkSPChanged:checked').length,
		errFlg: $('#checkFault:checked').length,
		htrElmntFlg: $('#checkElementUse:checked').length};
	//console.log(json);
	//alert('check json');
	$.post('users/submitAlert',json);
};
