# Code-shift
Automatic visualization of changes in structured text.

Given two similar versions of a JavaScript source code, this program is capable of generating a GIF animation showing continuous rewriting of one version into the other.

## How to setup
### ImageMagick
In order for Code-Shift to generate GIF images, it is necessary to have ImageMagick downloaded, since Code-shift runs this program to generate images. Furthermore, ImageMagick needs to be in a PATH directory.

To test whether ImageMagick is already installed in a PATH directory, open a terminal and run command "gm".

In case it isn't already installed, go to the following website and find appropriate download:
https://imagemagick.org/script/download.php

### Node.js
Code-shift is built to be ran in Node.js, which is a runtime for JavaScript apps. It is necessary to have both Node and NPM (packet manager for Node) installed.

To test whether Node and NPM are already installed, run following commands: "node -v" and "npm -v".

If Node or NPM aren't installed on your computer, go to the following website to download them:
https://nodejs.org/en/

### Code-shift and its libraries
Now that the previous steps are completed, either clone the repository of this project, or download the latest release. Unpack the archive, if the source code was downloaded inside one.

After doing so, open a terminal and navigate to the directory, which contains the source code and run command "npm install". This will download all JS libraries that Code-shift relies on.

If nothing went wrong, you are ready to use Code-shift.

## How to use
In the most basic use case, Code-Shift will generate animation of one JS source code being rewritten step by step into another one.
To achieve this, open a terminal and navigate into the directory containing the project. Now run command in this form:
```
node index.js -l JS -i [input1.js] -i [input2.js] -o [out.gif]
```
The execution takes a while, since generating the output animation involves generating a lot of image frames containing potentially a lot of text.

More use cases and an example are WIP.