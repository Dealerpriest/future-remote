# Future-remote
Prototype code for controlling Sphero 2.0 with Myo armband.

# Install
These steps should be undertaken i a terminal (obviously).
Make sure to have [node](https://nodejs.org/) installed (and [git](https://git-scm.com/), also obviously).
For some of the node packages in this project (serialport) you'll also need to have some compile tools installed (since these are native modules wrapped into node modules). These tools will probably ask to be installed when running the `npm install` command below. If not, check out the readme for [node-serialport](https://github.com/EmergingTechnologyAdvisors/node-serialport#installation-instructions). If you are having problems when it compiles (saying stuff about node-gyp or python or some other stuff), read about installation/troubleshooting on node-gyp [readme](https://github.com/nodejs/node-gyp)

**Cd to an appropriate folder where you want to installl the program.**
```
git clone https://github.com/Dealerpriest/future-remote.git
cd future-remote
npm install
```

# Update to latest version
cd to future-remote
```
git reset --hard
git pull
```

# Run
Make sure both myo and sphero is connected (and paired) appropriately.
Find the serial port of the sphero. How to achieve this can be found [here](https://github.com/orbotix/sphero.js#connecting-to-spherosprk)
Run the index.js program and provide it with the serial port of the Sphero.
```
PORT=insertSerialPortToSpheroHere node index.js
```
**Examples:**
```
PORT=COM5 node index.js // windows
PORT=/dev/tty.Sphero-GPB-AMP-SPP node index.js // *nix (mac, linux, etc)

```

# How to control the Sphero
**Make sure to have the usb port of the Myo facing the wrist.**
There are two control methods implemented. One called banking and one called aiming. Banking controls the Sphero with the tilt of the armband (having the logotype facing straight up means no roll). Aiming controls the Sphero by having the Sphero roll in the same direction the wearer of the Myo is pointing. Pointing downward, results in no roll.