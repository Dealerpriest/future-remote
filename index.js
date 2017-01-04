 "use strict";

var sphero = require("sphero");
var orb = sphero(process.env.PORT);


var Myo = require('myo');
var math3d = require('math3d');

//So we have quick acccess to the different APIs
var Quaternion = math3d.Quaternion;
var Vector3 = math3d.Vector3;

//initialize vectors with some values
var directionVector = Vector3.right;
var planeVector = Vector3.zero;

  // Myo = Myo.create();
  // console.log(Myo.myos[0]);
  Myo.connect('com.stolksdorf.myAwesomeApp', require('ws'));

  Myo.on('connected', function(){
	  console.log('connected!', Myo.myos);
	  console.log('unlocking!');
	  Myo.setLockingPolicy("none");
	});

	Myo.on('warmup_completed', function(){
		console.log("warmed up");
	})

 //  Myo.on('double_tap', function(){
 //    console.log('Setting reference point');
 //    this.zeroOrientation();
 //    this.vibrate();
	// });

  Myo.on('orientation', function(data){
    // var q = Quaternion.Euler(0,0,90);
    var q = new Quaternion(data['x'], data['y'], data['z'], data['w']);
    //math3d has right as posititve x-axis
    //positive x is along the arm when putting on myo (when usb socket is towards elbow)
    var referenceVector = Vector3.right;
    directionvector = q.mulVector3(referenceVector);
    planeVector = new Vector3(directionvector.x, directionvector.y, 0);

    //Att this point the y & z components in the directionvector represents direction.

    // console.log(directionvector.values.map(function(x){return x.toFixed(2)}));
    // console.log(q.angleAxis);

  });

  orb.connect().then(function() {
    console.log("SPHERO connected!");
  }).then(function() {
    orb.stopOnDisconnect(function(err, data) {
      console.log(err || "data" + JSON.stringify(data));
    });
  }).then(function(){
    setInterval(function(){
      console.log("directionvector is: " + directionvector.values.map(function(x){return x.toFixed(2)}));
      // console.log("with a magnitude of: " +directionVector.magnitude);
      var direction = Math.atan2(directionvector.x, directionvector.y)*180/Math.PI;
      direction += 180;//make it positive
      direction += 270; //align with myo's world coordinates
      direction %= 360; //wrap around at 360
      var speed = planeVector.magnitude * 100;

      console.log("sending roll request with direction: " + direction + " and speed " + speed);
      orb.roll(speed, direction);
    }, 500);
  });