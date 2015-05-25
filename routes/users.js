var express = require('express');
var router = express.Router();

/* GET dynamic data updates. */

//****************************
// main index AJAX Calls
//**************************

// Update Chart data
router.get('/updateChart', function(req, res) {
	// Retrieve and the last n records for views
	var recentData = req.recentData;
//	console.log('recentData:',recentData);
	res.send(recentData);
});


// update status data
router.get('/updateStatus', function(req,res) {
	var db = req.db;
	var recentData = req.recentData;
	//Retrieve the most recent data
	//console.log('most recentData:',recentData[recentData.length-1]);
	res.send(recentData[recentData.length-1]);
});

// change Setpoint
router.post('/changeSetPoint', function(req,res) {
	var db = req.db;
	Time = new Date().getTime();
//	console.log(req.body);
	SPNew = req.body.SP;
	Mode = req.body.Mode;
	SPOld = req.body.SP0;
	Dehum = req.body.Dehum;
	db.serialize(function() {
		var stmt = db.prepare("INSERT INTO schedule VALUES (?,?,?,?)");
		stmt.run(Time,SPNew,Mode,Dehum);
		stmt.finalize();
	}); 
	console.log('old SP = ',SPOld, 'changeSetPoint in routes to ', SPNew);
	res.send('got a post request');
});

// ***********************
// Schedule Page AJAX Calls
// *************************

// Add Schedule Event
router.post('/addSchedule', function(req,res) {
//	console.log(req.body);
	var db=req.db;
	db.serialize(function() {
		db.run("begin transaction");
		req.body.forEach(function(row) {
			console.log(row);
			SPNew = row.SP;
			Mode = row.Mode;
			Time = row.Time;
			Dehum = row.Dehum;
			var stmt = db.prepare("INSERT INTO schedule VALUES (?,?,?,?)");
			stmt.run(Time,SPNew,Mode,Dehum);
			stmt.finalize();
		});
		db.run("commit");
	}); 
	res.send('got a post request');
});


// Clear Schedule Event
router.post('/clearSchedule', function(req,res) {
//	console.log(req.body);
	var db=req.db;
	db.serialize(function() {
		db.run("begin transaction");
		req.body.forEach(function(row) {
			var stmt = db.prepare("DELETE FROM schedule WHERE Time BETWEEN ? AND ?");
			stmt.run(row.startClear, row.endClear);
			stmt.finalize();
		});
		db.run("commit");
	}); 
	res.send('got a post request');
});

//Get data for schedule chart
router.get('/schedChart', function(req, res) {
	// Retrieve schedule data for views
	var db = req.db;
	db.all("SELECT * FROM schedule ORDER BY Time ASC;",function(err,rows) {
		dbLast = rows;
		res.send(dbLast);
	});			
});

// ********************
// Historical Chart AJAX Calls
// *********************
//Get data for schedule chart
router.get('/historicalChart', function(req, res) {
	// Retrieve schedule data for views
	//console.log(req.query.week);
	startTime = Number(req.query.week);
	endTime = startTime + 3600*1000*24*7;
	//console.log(startTime, endTime);
	var db = req.db;
	stmt = "SELECT * FROM hyper WHERE TimeStamp BETWEEN " + startTime + " AND " + endTime + " ORDER BY TimeStamp ASC;";
	db.all(stmt,function(err,rows) {
		dbLast = rows;
		res.send(dbLast);
	});	
});

//Get data for day chart
router.get('/dayChart', function(req, res) {
	// Retrieve schedule data for views
	//console.log(req.query.week);
//	console.log(req.query);
	startTime = Number(req.query.startTime);
	endTime = Number(req.query.endTime);
//	console.log(startTime, endTime);
	var db = req.db;
	stmt = "SELECT * FROM hyper WHERE TimeStamp BETWEEN " + startTime + " AND " + endTime + " ORDER BY TimeStamp ASC;";
	db.all(stmt,function(err,rows) {
		dbLast = rows;
		res.send(dbLast);
	});	
});

//****************************
// Alerts AJAX Calls
//**************************
// send test msg
router.post('/testMsg', function(req,res) {
	var nodemailerData = req.nodemailerData;
	if (nodemailerData.service != 'NA') {
		var nodemailer = require('nodemailer');
		var transporter = nodemailer.createTransport({
			service: nodemailerData.service,
			auth: {
				user: nodemailerData.user,
				pass: nodemailerData.pass
			}
		});
		//console.log(req.body.newEmail);
		transporter.sendMail({
			from: nodemailerData.user,
			to: req.body.newEmail,
			subject: 'hello from Tsaimon',
			text: 'Hello from Tsaimon!  You have verified your email for alert.'
		});
	}
	res.send('got a post request');
});

// get the current alerts setup
router.get('/alertLoad', function(req, res) {
	var alertData = req.alertData;
	res.send(alertData);
});

// change Email for alerts
router.post('/changeEmail', function(req,res) {
	var jf = require('jsonfile');
	var nodemailerData = req.nodemailerData;
	var alertData = req.alertData;
	var alertFile = req.alertFile;
	if (nodemailerData.service != 'NA') {
		var nodemailer = require('nodemailer');
		var transporter = nodemailer.createTransport({
			service: nodemailerData.service,
			auth: {
				user: nodemailerData.user,
				pass: nodemailerData.pass
			}
		});
		//reconstruct the alert configuration file
		alertData.email = req.body.newEmail;
		jf.writeFileSync(alertFile,alertData);
		//console.log(jf.readFileSync(alertFile));

		// send a email for confirmation
		transporter.sendMail({
			from: nodemailerData.user,
			to: req.body.newEmail,
			subject: 'Tsaimon Change Email Success',
			text: 'hello from Tsaimon!  You have successfully changed your email for alerts.'
		});
	}
	res.send('got a post request');
});

// change alert options
router.post('/submitAlert', function(req,res) {
	var jf = require('jsonfile');
	var alertData = req.alertData;
	var alertFile = req.alertFile;
	//reconstruct the alert configuration file
	alertData.dayKwhrFlg = Number(req.body.dayKwhrFlg);
	alertData.dayKwhrLmt = Number(req.body.dayKwhrLmt);
	alertData.dayStbyFlg = Number(req.body.dayStbyFlg);
	alertData.dayStbyLmt = Number(req.body.dayStbyLmt);
	alertData.modeChgFlg = Number(req.body.modeChgFlg);
	alertData.SPChgFlg = Number(req.body.SPChgFlg);
	alertData.errFlg = Number(req.body.errFlg);
	alertData.htrElmntFlg = Number(req.body.htrElmntFlg);
	jf.writeFileSync(alertFile,alertData);
	res.send('got a post request');
});

module.exports = router;
