var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var moment = require('moment');
var jf = require('jsonfile');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

// memory debugging tools
//var agent = require('webkit-devtools-agent');
//agent.start();
// require('v8-profiler');

// initialize GE-SDK and sqlite
var gea = require("gea-sdk");
var adapter = require("gea-adapter-usb");
var sqlite3 = require("sqlite3"); // use .verbose() if dev.

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// initialize database files for input/output
var fs =require("fs");
var file = "tsaimon.db";
var alertFile = 'tsaimonalert.txt';
var nodemailerFile = 'tsaimonmailer.txt';
var exists = fs.existsSync(file);
var db = new sqlite3.Database(file);
var recentData = [];

// some global variables
var dbWrite = 0;
var dehum = false;

// Make our db and alert variables accesible to our router
app.use(function(req,res,next) {
	req.db= db;
	req.recentData = recentData;
	req.dehum = dehum;
	req.alertData = alertData;
	req.alertFile = alertFile;
	req.nodemailerData = nodemailerData;
	next();
});

app.use('/', routes);
app.use('/users', users);

// Check if nodemailer email service info file exist or not and create one if not exists
if (!fs.existsSync(nodemailerFile)) {
	fs.openSync(nodemailerFile,"w");
	jf.writeFileSync(nodemailerFile,{
		service: 'NA', 
		user: 'user email', 
		pass: 'password'});
	console.log(jf.readFileSync(nodemailerFile));
}
var nodemailerData = jf.readFileSync(nodemailerFile);

// Check if alert dat file exist or not and create one if not exists
if (!fs.existsSync(alertFile)) {
	fs.openSync(alertFile,"w");
	jf.writeFileSync(alertFile,{
		email: "youremail@server.com", 
		dayKwhrFlg: 0, 
		dayKwhrLmt: 5, 
		dayStbyFlg: 0, 
		dayStbyLmt: 50,
		modeChgFlg: 0,
		SPChgFlg: 0,
		errFlg: 0,
		htrElmntFlg: 0});
	console.log(jf.readFileSync(alertFile));
}
var alertData = jf.readFileSync(alertFile);

// Check if database exists or not and create one if not exists
if (!exists) {
	console.log("Creating DB File.");
	fs.openSync(file,"w");
	db.serialize(function() {
		db.run("CREATE TABLE hyper (TimeStamp INTEGER, UE INTEGER, LE INTEGER, Comp INTEGER, Fan INTEGER, SP INTEGER, T2 REAL, T3a REAL, T3b REAL, T4 REAL, T5 REAL, Amp REAL, Volt INTEGER, EEV INTEGER, Flow INTEGER, Mode INTEGER);");
		db.run("CREATE TABLE schedule (Time INTEGER, SP INTEGER, Mode INTEGER, Dehum INTEGER);");
		db.run("CREATE INDEX TimeStamp_index ON hyper (TimeStamp);");
		db.run("CREATE INDEX Time ON schedule (Time);");
	});	
}

// Set the sqlite3 cache size to prevent gobbling too much memory
db.run("PRAGMA cache_size = 50;");

//initialize some variables for alert
var ModeOld = "";
var SPOld = "";
var dateOld = moment().date();	
var UEOld = "";
var LEOld = "";
var err1Old = 0;
var err2Old = 0;
var err3Old = 0;
var err4Old = 0;


// configure the gea bus application
var geapp = gea.configure({
    address: 0xcb,
});

// bind to the adapter to access the bus
geapp.bind(adapter, function (bus) {
    console.log("bind was successful");
	bus.on("appliance",function(appliance) {
		var hyp1 = "";
		var hyp2 = "";
		setInterval(function(){
//**** alternate method using sequential blocking *******
		var Flow = require('gowiththeflow');
			Flow().par(function(next){
				//get hyperterminal data from appliance
				appliance.send(0x56,[],function(data1) {
					next(null,data1);				
				});
			}).par(function(next){
				// Get additional for mode
				appliance.send([0xDE],[0x10],function(data2) {
					next(null,data2);
				});
			}).seq(function(next,err,res){
			// write Hyperterminal data to databases
					timeStamp = new Date().getTime();
					UE = res[0][0];
					LE = res[0][1];
					COMP = res[0][2];
					FAN = res[0][3];			
					SP = res[0][4];		
					T2 = (res[0][5]*256 + res[0][6])/10;
					T3a = (res[0][7]*256 + res[0][8])/10;
					T3b = (res[0][9]*256 + res[0][10])/10;
					T4 = (res[0][11]*256 + res[0][12])/10;
					T5 = (res[0][13]*256 + res[0][14])/10;
					Amp = res[0][15]/10;
					Volt = res[0][16]*256 + res[0][17];
					EEV = res[0][18]*256 + res[0][19];
					Flow = res[0][20];			
//					Mode = res[0][21];  Deleted due to different modes being used...	
					Mode = res[1][8];
					console.log(timeStamp,UE,LE,COMP,FAN,SP,T2,T3a,T3b,T4,T5,Amp,Volt,EEV,Flow,Mode,dehum);
					if (recentData.length > 360) {
						recentData.shift();
					}
					recentData.push({'TimeStamp':timeStamp,'UE':UE,'LE':LE,'Comp':COMP,'Fan':FAN,'SP':SP,'T2':T2,'T3a':T3a,'T3b':T3b,'T4':T4,'T5':T5,'Amp':Amp,'Volt':Volt,'EEV':EEV,'Flow':Flow,'Mode':Mode,'Dehum':dehum});
					// check for initial startup for alerts
					if (SPOld === "") {
						SPOld = SP;
						ModeOld = Mode;
						UEOld = UE;
						LEOld = LE;
					}
					alertChk(SP,Mode,UE,LE,appliance);
					db.serialize(function() {
					// Check to see if need to change SP/Modes
						qstr = 'SELECT * FROM schedule WHERE Time<'+ timeStamp + ' ORDER BY abs('+ timeStamp + '-Time) LIMIT 1;';
						var stmt = db.prepare(qstr);
						stmt.all(function(err,row) {
//							console.log(err,row);
							if (row != "") {
								if (row[0].SP != SP || row[0].Mode != Mode || row[0].Dehum != dehum) {
									console.log(row[0].SP, SP, row[0].Mode, Mode);
									// Change Mode
									if ([row[0].Mode] == 4) {
										console.log('went to vacation mode');
										appliance.send(0xDF, [0x14,row[0].Mode,99,50]);
									} else {
										console.log('went to regular modes'); 
										appliance.send(0xDF, [0x14, row[0].Mode]);
										// Change SP
										appliance.send(0xA5,[row[0].SP]);
										// Change SH for dehum
										if (row[0].Dehum) {
											appliance.send(0xEA,[15]);
											dehum = row[0].Dehum;
//											console.log('changed to dehum mode');
										} else {
											appliance.send(0xEA,[10]);
											dehum = row[0].Dehum;
//											console.log('changed back to non-dehum mode');
										}	
									}
									// delete the executed schedule record
									db.run("DELETE FROM schedule WHERE Time=" + row[0].Time);
									console.log('changed SP to ',row[0].SP,' changed mode to:',row[0].Mode, 'dehum: ',row[0].Dehum);
								}
							}
						});
						stmt.finalize();
						// only write to the database every minute
						dbWrite = dbWrite +1;
						if (dbWrite == 12) {
							stmt = db.prepare("INSERT INTO hyper VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
							stmt.run(timeStamp,UE,LE,COMP,FAN,SP,T2,T3a,T3b,T4,T5,Amp,Volt,EEV,Flow,Mode);
							stmt.finalize();
							dbWrite = 0; // reset db write counter
							console.log('writing to db');
						}
					});
				next();
			});
		},5000);
	});
});



function alertChk(SP,Mode,UE,LE,appliance) {
//	console.log(alertData);
	if (alertData.SPChgFlg == 1 && SPOld != SP) {
		SPOld = SP;
		alertMsg = 'SP has changed to ' + SP;
		alertSend(alertMsg);
		console.log(alertMsg);
	}
	if (alertData.modeChgFlg == 1 && ModeOld != Mode) {
		ModeOld = Mode;
		switch (Mode) {
			case 0:
				mode = 'Hybrid';
				break;
			case 1:
				mode = 'Std Electric';
				break;
			case 2:
				mode = 'Heat Pump';
				break;
			case 3:
				mode = 'High Demand';
				break;
			case 4:
				mode = 'Vacation';
				break;
			default:
				mode = "";
				break;
		}
		alertMsg = 'Mode has changed to ' + mode;
		alertSend(alertMsg);
		console.log(alertMsg);
	}
	if (alertData.htrElmntFlg == 1 && UEOld != UE && Mode != 1){
		UEOld = UE;
		if (UE == 1) { 
			alertMsg = 'Upper Element Turned On';
			alertSend(alertMsg);
			console.log(alertMsg);
		}
	}
	if (alertData.htrElmntFlg == 1 && LEOld != LE && Mode != 1){
		LEOld = LE;
		if (LE == 1) { 
			alertMsg = 'Lower Element Turned On';
			alertSend(alertMsg);
			console.log(alertMsg);
		}
	}
	if (alertData.errFlg ==1) {
		appliance.send([0xDE],[0x14],function(fault) {
			if (err1Old != fault[1]) {
				err1Old = fault[1];
				if (fault[1] !== 0) {
					alertMsg = 'There is a new fault on byte1: ' + fault[1];
					alertSend(alertMsg);
					console.log(alertMsg);
				}
			}
			if (err2Old != fault[2]) {
				err2Old = fault[2];
				if (fault[2] !== 0) {
					alertMsg = 'There is a new fault on byte2: ' + fault[2];
					alertSend(alertMsg);
					console.log(alertMsg);
				}
			}
			if (err3Old != fault[3]) {
				err3Old = fault[3];
				if (fault[3] !== 0) {
					alertMsg = 'There is a new fault on byte3: ' + fault[3];
					alertSend(alertMsg);
					console.log(alertMsg);
				}
			}
			if (err4Old != fault[4]) {
				err4Old = fault[4];
				if (fault[4] !== 0) {
					alertMsg = 'There is a new fault on byte4: ' + fault[4];
					alertSend(alertMsg);
					console.log(alertMsg);
				}
			}
		});
	}
	if (alertData.dayKwhrFlg == 1 || alertData.dayStbyFlg == 1) {
		if (dateOld != moment().date()) { // need to check ok if new month?
			//compile KWHr data ans Stby% for the previous day
			dayStart = moment().startOf('day').valueOf() - 3600 * 24 * 1000;
			dayEnd = dayStart + 3600 * 24 * 1000;	
			stmt = "SELECT * FROM hyper WHERE TimeStamp BETWEEN " + dayStart + " AND " + dayEnd + " ORDER BY TimeStamp ASC;"
			db.all(stmt,function(err,rows) {
				var UE = 0;
				var LE = 0;
				var Comp = 0;
				var stby = 0;
				var Watt = 0;
				var KWHr = 0;
				rows.forEach(function(row) {
					UE = UE + row.UE;
					LE = LE + row.LE;
					if (row.LE === 0) {
						Comp = Comp + row.Comp; // only count compressor if LE is not on.
					}
					if (row.UE === 0 && row.LE === 0 && row.Comp === 0) {
						stby = stby + 1;
					}
					Watt = Watt + row.Amp * row.Volt; 
				});
				// convert to Standby% and KWHr
				stby = (stby/(UE+LE+Comp+stby))*100;
				KWHr = Watt * 60/3600/1000;
				// check for over limit
				if (alertData.dayKwhrFlg == 1 && KWHr>alertData.dayKwhrLmt) {
					alertMsg = moment(dayStart).format('L') + ' has energy usage of: ' + KWHr + ' KWHr';
					alertSend(alertMsg);
					console.log(alertMsg);
				}
				if (alertData.dayStbyFlg == 1 && stby<alertData.dayStbyLmt) {
					alertMsg = moment(dayStart).format('L') + ' has standby time of: ' + stby + ' %';
					alertSend(alertMsg);
					console.log(alertMsg);
				}					
			});
			dateOld = moment().date(); // change the date to current after finish
		}
	}
}

function alertSend(alertMsg) {
	if (nodemailerData.service != 'NA') {
		var nodemailer = require('nodemailer');
		var transporter = nodemailer.createTransport({
			service: nodemailerData.service,
			auth: {
				user: nodemailerData.user,
				pass: nodemailerData.pass
			}
		});
	
		// send a email for alert
		transporter.sendMail({
			from: nodemailerData.user,
			to: alertData.email,
			subject: 'Tsaimon Alert',
			text: alertMsg
		});
	}
}


	//set superheat target
//		appliance.send(0xEA,[8]);
//		appliance.send(0xE9,[10]);
	//get EEV Data
//		appliance.send(0xEF,[],function(data) {
//			console.log("EEV Control: ",data);
//		});



// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// uncaughtException
process.on('uncaughtException', function(er) {
	console.error(er.stack);
	process.exit(1);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;
