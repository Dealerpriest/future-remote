# future-remote
Prototype code for controlling Sphero 2.0 with Myo armband.

# install
these steps should be undertaken i a terminal (obviously).
Make sure to have node installed (and git, also obviously).
Cd to an appropriate folder
```
git clone https://github.com/Dealerpriest/future-remote.git
cd future-remote
npm install
```

# update to newest version
cd to future-remote
```
git reset --hard
git pull
```

# run
make sure both myo and sphero is connected (and paired) appropriately.
find the mac address of the sphero. This can be achieved by calling:
```
node discover-bluetooth.js
```
Run the index.js program and provide it with the mac address of the Sphero.
```
ADDRESS=insertMacAddresToSpheroHere node index.js
```
*Example:*
```
ADDRESS=68:86:e7:03:15:c4 node index.js
```