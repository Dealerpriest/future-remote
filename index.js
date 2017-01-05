 "use strict";
var commandTimeout = 50; //timeout before sent commands are considered dead.
var sphero = require("sphero");
var orb = sphero(process.env.PORT, {timeout: commandTimeout});

//Inactivate all sphero interaction by setting to false
var useSphero = true;
// 'aiming', 'banking'
var controlMethod = 'banking'


var Myo = require('myo');
var math3d = require('math3d');
//math3d uses x=right, y=up, z=forward

//So we have quick acccess to the different APIs
var Quaternion = math3d.Quaternion;
var Vector3 = math3d.Vector3;

//math3d has right as posititve x-axis
//positive x is along the arm when putting on myo (when usb socket is towards elbow)
var armAxis = Vector3.right;
//initialize some more vectors with some values
var directionVector = Vector3.right;
//holds the direction of arm projected on ground plane
var projectedDirectionVector = Vector3.zero;

//math3d has forward as z axis;
var upAxis = Vector3.forward;
//planeVector holds the banking of the plane
var planeVector = Vector3.zero;

var accelerometerPlaneVector = Vector3.zero;

var myoSpheroAngleOffset = 270;

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
});

//Strangely this doesn't seem to work. I get towards_elbow in all configurations. The only value that changes is arm, even when just flipping the arm band on same arm. 
Myo.on('arm_synced', function(){
  console.log("arm is synced");
  console.log("on arm" + Myo.myos[0].arm);
  console.log("myo logo is towards: " + Myo.myos[0].direction);
  if(Myo.direction === 'towards_wrist'){
    console.log("inverting armAxis");
    // myoSpheroAngleOffset = 90;
    armAxis = Vector3.left;
  }
});

//  Myo.on('double_tap', function(){
//    console.log('Setting reference point');
//    this.zeroOrientation();
//    this.vibrate();
// });

Myo.on('orientation', function(data){
  // var q = Quaternion.Euler(0,0,90);
  var q = new Quaternion(data['x'], data['y'], data['z'], data['w']);
  
  directionVector = q.mulVector3(armAxis);
  projectedDirectionVector = new Vector3(directionVector.x, directionVector.y, 0);

  planeVector = q.mulVector3(upAxis);

  //Att this point the y & z components in the directionVector represents direction.
  if(!useSphero){
    // console.log(q.eulerAngles);
    // console.log(planeVector.values.map(function(x){return x.toFixed(2)}));
    // console.log(q.angleAxis);
  }
});

Myo.on('accelerometer', function(data){
  accelerometerPlaneVector = new Vector3(data.x, data.y, 0);

  if(!useSphero){
    console.log(accelerometerPlaneVector);
  }
})

//Set useSphero to false if you want to debug myo band without having a crazy ball running around all over
if(useSphero){
  orb.connect().then(function() {
    console.log("SPHERO connected!");
  }).then(function() {
    orb.stopOnDisconnect(function(err, data) {
      console.log(err || "data" + JSON.stringify(data));
    });
  }).then(function(){
    setInterval(controlSphero, commandTimeout+10);
  });
}

function controlSphero(){
  switch (controlMethod){
    case 'banking':
      bankControl();
      break;
    case 'aiming':
      aimControl();
      break;
  }
}

function aimControl(){
  console.log("directionvector is: " + directionVector.values.map(function(x){return x.toFixed(2)}));
  // console.log("with a magnitude of: " +directionVector.magnitude);
  var direction = Math.atan2(projectedDirectionVector.x, projectedDirectionVector.y)*180/Math.PI;
  direction += 180;//make it positive
  direction += myoSpheroAngleOffset; //align with myo's world coordinates
  direction %= 360; //wrap around at 360
  var speed = projectedDirectionVector.magnitude * 100;

  console.log("sending roll request with direction: " + direction + " and speed " + speed);
  orb.roll(speed, direction);
}

function bankControl(){
  console.log("accelerometerPlaneVector" + accelerometerPlaneVector.values.map(function(x){return x.toFixed(2)}));

  var armDirection = vec2ToPositiveAngle(projectedDirectionVector.x, projectedDirectionVector.y);
  console.log(armDirection);
  // console.log("with a magnitude of: " +directionVector.magnitude);
  var bankDirection = vec2ToPositiveAngle(accelerometerPlaneVector.x, accelerometerPlaneVector.y);
  console.log(bankDirection);
  var rollDirection = armDirection + bankDirection + myoSpheroAngleOffset;
  rollDirection = constrainAngle(rollDirection);

  var speed = accelerometerPlaneVector.magnitude * 100;

  console.log("sending roll request with rollDirection: " + rollDirection + " and speed " + speed);
  orb.roll(speed, rollDirection);

}

function vec2ToPositiveAngle(x, y){
  var angle = Math.atan2(x, y)*180/Math.PI;
  angle += 180;//make it positive
  angle %= 360; //wrap around at 360
  return angle;
}

function constrainAngle(angle){
  return angle%360;
}