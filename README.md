# Artex Development Dashboard
Artex Development Dashboard, otherwise known as ADD, is an open-source desktop application made using Electron for the developer API. The purpose of ADD is not to create a production-ready application, but rather to provide developers with some examples of the developer API used in a desktop application.

The developer API can be found at https://www.theartex.net/api/.

### Features
- Custom application design
- Online authentication
- Announcements
- Desktop notifications
- Alerts

### Build Instructions
Before anything, please make sure you have Node.js, NPM and Yarn installed globally.

Once you have cloned the files to a local directory, make sure to include your application's identifier in the `main.js` and `add.js` files.

Run the following command to add electron-builder as a local dependency.
```
$ yarn add electron-builder --dev
```

Then, run the following command to make sure that the `yarn.lock` file is up-to-date.
```
$ yarn
```

Finally, run the following command to build the application for your operating system. All necessary dependencies will be automatically included.
```
$ yarn dist
```
