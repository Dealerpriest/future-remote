# future-remote
Prototype code for controlling Sphero 2.0 with Myo armband.

# install
these steps should be undertaken i a terminal (obviously).
Make sure to have node installed (and git, also obviously).
Cd to an appropriate folder
```
git clone git@github.com:Dealerpriest/future-remote.git
cd future-remote
npm install
```
# run
make sure both myo and sphero is connected (and paired) appropriately.
find the name of the serialport to sphero.
```
PORT=insertSerialportToSpheroHere node index.js
```
