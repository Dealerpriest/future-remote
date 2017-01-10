 "use strict";
var sphero = require("sphero");
var Myo = require('myo');
var fs = require('fs');
var keypress = require("keypress");
var math3d = require('math3d');

// var myAdaptor = require('./custom-adaptor.js');
var serialAdaptor = require('./serialport-adaptor.js');
//math3d uses x=right, y=up, z=forward

var commandTimeout = 50; //timeout before sent commands are considered dead.
var commandInterval; //this will get calculated from commandTimeout
var commandFailCounter = 0;
const failedCommandThreshold = 10;
// var orb = sphero(process.env.PORT, {timeout: commandTimeout});
if(!process.env.PORT){
  console.log("please provide a serial port as input by setting the PORT environment variable!");
  process.exit()
}
var orb = sphero(null, {timeout: commandTimeout, adaptor: new serialAdaptor(process.env.PORT)});
// var orb = sphero(null, {timeout: commandTimeout, adaptor: new myAdaptor(process.env.ADDRESS)});

//Inactivate all sphero interaction by setting to false
var useSphero = true;
// 'aiming', 'banking'
const controlMethods = {
  banking: 0,
  aiming: 1,

}
var controlMethod = controlMethods.aiming;
var spheroConnected = false;
var colors = ['green', 'magenta', 'purple', 'yellow'];

//So we have quick acccess to the different APIs
var Quaternion = math3d.Quaternion;
var Vector3 = math3d.Vector3;

//math3d has right as posititve x-axis
//positive x is along the arm when putting on myo (when usb socket is towards elbow)
var armAxis = Vector3.right;
//initialize some more vectors with some values
var armDirectionVector = Vector3.right;
//holds the direction of arm projected on ground plane
var projectedArmDirectionVector = Vector3.zero;
var projectedArmDirectionAngle = 0;
var adjustedArmdDirectionAngle

// //math3d has forward as z axis;
// var upAxis = Vector3.forward;
// //planeVector holds the banking of the plane
// var planeVector = Vector3.zero;

//How is the acccelerometer banking in the ground plane?
var accelerometerOffsetAngle = 0;
var accelerometerPlaneVector = Vector3.zero;
var bankDirectionAngle = 0;

var myoSpheroAngleOffset = 0;

var myoStream = undefined;
var logMyo = false;
var logCounter = 0;

var doubleTapCounter = 0;

var myoIsOnArm = false;

//Listening for keypresses
keypress(process.stdin);
process.stdin.on("keypress", handle);

console.log("starting to listen for key presses");

process.stdin.setRawMode(true);
process.stdin.resume();

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
  myoIsOnArm = true;
  console.log("arm is synced");
  console.log("on arm" + Myo.myos[0].arm);
  console.log("myo logo is towards: " + Myo.myos[0].direction);
  if(spheroConnected){
    orb.color(colors[controlMethod]);
  }
});

Myo.on('arm_unsynced', function(){
  console.log("armBand taken off!");
  myoIsOnArm = false;
  if(spheroConnected){
    orb.stop();
    orb.color('red');
  }
})

var calibrationTimeout;
Myo.on('double_tap', function(){
  if(doubleTapCounter%2 === 0){
    console.log('First double tap');
    if(spheroConnected){
      orb.stop();
      orb.startCalibration();
    }
    this.vibrate();
    console.log("myoSpheroAngleOffset: " + myoSpheroAngleOffset);
    calibrationTimeout = setTimeout(function(){
      doubleTapCounter++;
      if(spheroConnected){
        orb.finishCalibration();
        orb.color(colors[controlMethod]);
        this.vibrate();
      }
    }.bind(this), 10000);
  }else{
    clearTimeout(calibrationTimeout);
    console.log('Second double tap');
    myoSpheroAngleOffset = 360 - projectedArmDirectionAngle;
    if(spheroConnected){
      orb.finishCalibration();
      orb.color(colors[controlMethod]);
    }
    this.vibrate();
  }
  doubleTapCounter++;
});

Myo.on('fingers_spread', function(){
  console.log("Changing control method");
  this.vibrate();
  controlMethod++;
  controlMethod %= Object.keys(controlMethods).length;
  if(spheroConnected){
    orb.color(colors[controlMethod]);
  }
})

Myo.on('orientation', function(data){

  //Calculate all orientation variable to be used to control the sphero
  var q = new Quaternion(data['x'], data['y'], data['z'], data['w']);
  armDirectionVector = q.mulVector3(armAxis);
  projectedArmDirectionVector = new Vector3(armDirectionVector.x, -armDirectionVector.y, 0);
  projectedArmDirectionAngle = vec2ToPositiveAngle(projectedArmDirectionVector.x, projectedArmDirectionVector.y);
  adjustedArmdDirectionAngle = constrainAngle(projectedArmDirectionAngle + myoSpheroAngleOffset);

  // planeVector = q.mulVector3(upAxis);

  //Att this point the y & z components in the armDirectionVector represents direction.
  if(!useSphero){
    // console.log(projectedArmDirectionVector.values.map(function(x){return x.toFixed(2)}));
    console.log("armAngle: " + projectedArmDirectionAngle);
    console.log("adjusting with: " + myoSpheroAngleOffset + ". Adjusted angle: " + adjustedArmdDirectionAngle);
    // console.log(q.eulerAngles);
    // console.log(planeVector.values.map(function(x){return x.toFixed(2)}));
    // console.log(q.angleAxis);
  }
});

Myo.on('accelerometer', function(data){
  //TODO: Offset the vector here so we dont have to worry about how the myo is rotated around the arm


  accelerometerPlaneVector = new Vector3(data.x, data.y, 0);
  bankDirectionAngle = vec2ToPositiveAngle(accelerometerPlaneVector.x, -accelerometerPlaneVector.y);

  if(!useSphero){
    // console.log(accelerometerPlaneVector);
  }
})

//Set useSphero to false if you want to debug myo band without having a crazy ball running around all over
if(useSphero){
  orb.connect().then(onSpheroConnected, onSpheroConnectionFail);
}

function onSpheroConnectionFail(){
  console.log("Connection FAILED!!! Retrying!");
  orb.connect().then(onSpheroConnected, onSpheroConnectionFail);
}

function onSpheroConnected(){
  console.log("SPHERO connected!");
  orb.on("error", function(err, data) {
    console.log("sphero error");
  });
  spheroConnected = true;
  orb.color(colors[controlMethod]);

  orb.setAutoReconnect(0, 50, function(err, data) {
    console.log(err || "data: " + data);
  });

  orb.stopOnDisconnect(function(err, data) {
    console.log(err || "data" + JSON.stringify(data));
  });

  commandInterval = commandTimeout+10;
  setTimeout(controlSphero, commandInterval);
}



function controlSphero(){
  //always repeat this function. No matter what
  setTimeout(controlSphero, commandInterval);
  // console.log("controlSphero. CommandInterval is " + commandInterval);
  if(!myoIsOnArm || !spheroConnected)
    return; //Bail out. We don't want to control the sphero when the myo isn't on. Or if there is no sphero
  switch (controlMethod){
    case controlMethods.banking:
      bankControl();
      break;
    case controlMethods.aiming:
      aimControl();
      break;
  }
}

function commandFailed(){
  // console.log("command failed. CommandInterval is " + commandInterval);
  commandInterval++;
  //constrain
  if(commandInterval >= 100){
    commandInterval = 100
  }
  // commandFailCounter++;
  // if(commandFailCounter > failedCommandThreshold){
  //   commandCongestion();
  //   commandFailCounter = 0;
  // }
}

function commandSuccess(){
  // console.log("command success. CommandInterval is " + commandInterval);
  commandInterval--;
  if(commandInterval < commandTimeout + 10){
    commandInterval = commandTimeout + 10;
  }
  // commandFailCounter++;
  // if(commandFailCounter > failedCommandThreshold){
  //   commandCongestion();
  //   commandFailCounter = 0;
  // }
}

function aimControl(){
  // console.log("armDirectionVector is: " + armDirectionVector.values.map(function(x){return x.toFixed(2)}));
  // console.log("with a magnitude of: " +armDirectionVector.magnitude);

  var speed = projectedArmDirectionVector.magnitude * 100;

  // console.log("sending roll request with direction: " + adjustedArmdDirectionAngle + " and speed " + speed);
  orb.roll(speed, adjustedArmdDirectionAngle).then(commandSuccess, commandFailed);
}

function bankControl(){
  // console.log("accelerometerPlaneVector" + accelerometerPlaneVector.values.map(function(x){return x.toFixed(2)}));
  // console.log("with a magnitude of: " +armDirectionVector.magnitude);
  
  // console.log("bankDirectionAngle: " + bankDirectionAngle);
  var rollDirection = bankDirectionAngle + adjustedArmdDirectionAngle;
  rollDirection = constrainAngle(rollDirection);

  var speed = accelerometerPlaneVector.magnitude * 100;

  // console.log("sending roll request with rollDirection: " + rollDirection + " and speed " + speed);
  orb.roll(speed, rollDirection).then(commandSuccess, commandFailed);

}

function vec2ToPositiveAngle(x, y){
  var angle = Math.atan2(y, x)*180/Math.PI;
  angle += 360;//make it positive
  angle %= 360; //wrap around at 360
  return angle;
}

function constrainAngle(angle){
  return angle%360;
}

function handle(ch, key) {

  if (key.ctrl && key.name === "c") {
    if(myoStream){
      myoStream.end();
    }
    process.stdin.pause();
    process.exit();
  }

  if(key.name === 'a'){
    console.log('changing to aim control');
    controlMethod = controlMethods.aiming;
  }else if(key.name === 'b'){
    console.log('changing to bank control');
    controlMethod = controlMethods.banking;
  }

  //TODO: check if buffer gets discarded or if there are samples missing in the log file
  if (!logMyo && key.name === "l") {
    //Setup logfile
    myoStream = fs.createWriteStream('myo.csv');
    myoStream.write("nr, milliseconds, angle\n");
    //initiate logging of data
    setInterval(function(){
      console.log("saving a data sample");
      // var dataSample = "" + projectedArmDirectionVector.x + "," + projectedArmDirectionVector.y + "\n";
      var dataSample = logCounter + ", " + Date.now() + ", " + vec2ToPositiveAngle(projectedArmDirectionVector.x, projectedArmDirectionVector.y) + "\n";
      myoStream.write(dataSample);
      logCounter++;
    }, 1000);
  }
}