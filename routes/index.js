var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Tsaimon' });
});

/* Schedule Page */
router.get('/schedule', function(req,res,next) {
	res.render('schedule', { title: 'Tsaimon Scheduler' });
});

/* History Page */
router.get('/history', function(req,res,next) {
	res.render('history', { title: 'Tsaimon History' });
});

/* Alert Page */
router.get('/alerts', function(req,res,next) {
	res.render('alerts', { title: 'Tsaimon Alerts' });
});


/* Addevent ------- temporary */
router.post('/addevent', function(req,res) {
	console.log(req.body);
	res.redirect("schedule");
});

module.exports = router;
