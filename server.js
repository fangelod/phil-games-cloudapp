#!/bin/env node
// Imports
var express = require('express');
var fs      = require('fs');
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer();
var mongojs = require('mongojs');

// default to a 'localhost' configuration:
var uri = '127.0.0.1:27017/YOUR_APP_NAME';

// if OPENSHIFT env variables are present, use the available connection info:
if(process.env.OPENSHIFT_MONGODB_DB_PASSWORD){
    uri = process.env.OPENSHIFT_MONGODB_DB_USERNAME + ":" +
    process.env.OPENSHIFT_MONGODB_DB_PASSWORD + "@" +
    process.env.OPENSHIFT_MONGODB_DB_HOST + ':' +
    process.env.OPENSHIFT_MONGODB_DB_PORT + '/' +
    process.env.OPENSHIFT_APP_NAME;
}

// Assigning each collection to a variable
var collections = ['categories'];
var collections2 = ['structure'];
var collections3 = ['user'];

// Connecting to collections
var db = mongojs(uri, collections);
var db2 = mongojs(uri, collections2);
var db3 = mongojs(uri, collections3);

var SampleApp = function(){

    // Scope.
    var self = this;

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        self.ipaddr  = process.env.OPENSHIFT_NODEJS_IP;
        self.port    = parseInt(process.env.OPENSHIFT_NODEJS_PORT) || 8080;

        if (typeof self.ipaddr === "undefined") {
            // Log errors on OpenShift but continue w/ 127.0.0.1 - this
            // allow us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP environment variable');
            self.ipaddress = "127.0.0.1";
        };
    };

    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }

        // Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
        self.zcache['admin.html'] = fs.readFileSync('./admin.html');
    };

    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };

    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };

    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };

    // Creating routing table entries + handlers for the application
    self.routes = {};

    self.routes['/asciimo'] = function(req, res) {
        var link = "http://i.imgur.com/kmbjB.png";
        res.send("<html><body><img src='" + link + "'></body></html>");
    };

    /**
     *  Default Route. Loads the index.html
     *  Type: GET
     *  Data: None
     *  Response: HTML → index.html
     */
    self.routes['/'] = function(req, res) {
        /*var link = "http://www.wallpaperup.com/uploads/wallpapers/2014/09/25/455895/big_thumb_6b2d7a6264cc4b37209fc5e560e3ebe0.jpg";
        res.send("<html><body><img style='width:100%;' src='" + link + "'></body></html>");*/

        res.setHeader('Content-Type', 'text/html');
        res.send(self.cache_get('index.html') );
    };

    /**
     *  Admin Panel. Loads the admin.html
     *  Type: GET
     *  Data: None
     *  Response: HTML → admin.html
     */
    self.routes['/admin.html'] = function(req, res) {
        res.setHeader('Content-Type', 'text/html');
        res.send(self.cache_get('admin.html'));
    }

    /**
     *  Route for getting a user. Used in conjunction with onyen
     *  authenticator. If user is not found in database, it will create a
     *  new user document in the database.
     *  Type: GET
     *  Data: JSON
     *  →   {UID: String → UID of the user,
     *       PID: String → PID of the user,
     *       onyen: String → onyen of the user}
     *  Response: JSON
     *  →   {"_id": String → mongo generated id,
     *       "PID": String  → PID of the user,
     *       "onyen": String  → onyen of the user,
     *       "isAdmin": boolean → true = admin, false = student,
     *       "term": String → term that the user is in,
     *       "score": {
     *          "catright": int → # of category checks gotten right,
     *          "catwrong": int → # of category checks gotten wrong,
     *          "markright": int → # of markings submitted right,
     *          "markwrong": int → # of markings submitted wrong,
     *          "validright": int → # of conclusions answered right,
     *          "validwrong": int → # of conclusions answered wrong}}
     */
    self.routes['/user'] = function (req, res) {
        var isThere;
        var userObject;

        // Find user in database
        db3.user.findOne({UID: req.param('UID')}, function(err, user) {
            if (err || !user) {
                isThere = false;
            } else {
                if (user != null) {
                    isThere = true;
                    userObject = user;
                } else {
                    isThere = false;
                }
            }
            returnFunction();
        });

        // function for returning a found user or inserting a new one
        var returnFunction = function() {
            if (isThere != null) {
                if (isThere) {
                    res.send(userObject);
                } else {
                    db3.user.insert({
                        UID: req.param('UID'),
                        PID: req.param('PID'),
                        onyen: req.param('onyen'),
                        isAdmin: false,
                        term: null,
                        score: {
                            catright: 0,
                            catwrong: 0,
                            markright: 0,
                            markwrong: 0,
                            validright: 0,
                            validwrong: 0
                        }
                    });
                    res.end("Added new user");
                }
            }
        }
    };

    // TESTING REQUIRED
    /**
     *  Route for assigning a term to a user
     *  Type: POST
     *  Data: JSON
     *  →   {UID: String → UID of the user,
     *       term: String → term to be assigned}
     *  Response: None
     */
    self.routes['/assignTerm'] = function (req, res) {
        var admin = false;

        db3.user.findOne({UID: req.param('UID')}, function(err, user) {
            if (err || !user) {
                res.status(500).send('User not found');
            } else {
                if (user != null) {
                    if (user.isAdmin) {
                        res.status(500).send("User is an admin. Please use /createTerm route");
                        admin = true;
                        res.end();
                    }
                }
            }
            assign();
        });

        var assign = function() {
            if (!admin) {
                db3.user.update({UID: req.param('UID')}, { $set: { "term": req.param('term')}});

                res.send("Updated term");
            }
        }

    };

    /**
     *  Route for getting all users in a particular term. This route checks if
     *  the user that made the request to get all users under a term is an
     *  admin.
     *  Type: GET
     *  Data: JSON
     *  →   {UID: String → UID of admin user,
     *       term: String → term to get all users of}
     *  Response: user document array
     *  →   {users: [{"_id": String → mongo generated id,
     *               "PID": String → PID of the user,
     *               "onyen": String → onyen of the user,
     *               "isAdmin": boolean → true = admin, false = student,
     *               "term": String → term that was requested,
     *               "score": {
     *                  "catright": int → # of category checks gotten right,
     *                  "catwrong": int → # of category checks gotten wrong,
     *                  "markright": int → # of markings submitted right,
     *                  "markwrong": int → # of markings submitted wrong,
     *                  "validright": int → # of conclusions answered right,
     *                  "validwrong": int → # of conclusions answered wrong}},
     *               {"_id": String → mongo generated id,
     *               "PID": String → PID of the user,
     *               "onyen": String → onyen of the user,
     *               "isAdmin": boolean → true = admin, false = student,
     *               "term": String → term that was requested,
     *               "score": {
     *                  "catright": int → # of category checks gotten right,
     *                  "catwrong": int → # of category checks gotten wrong,
     *                  "markright": int → # of markings submitted right,
     *                  "markwrong": int → # of markings submitted wrong,
     *                  "validright": int → # of conclusions answered right,
     *                  "validwrong": int → # of conclusions answered wrong}},
     *                                          .
     *                                          .
     *                                          .                             ]}
     */
    self.routes['/getTerm'] = function (req, res) {
        var fs = [];
        var admin = false;

        db3.user.findOne({UID: req.param('UID')}, function(err, user) {
            if (err || !user) {
                res.status(500).send('User not found');
            } else {
                if (user != null) {
                    if (user.isAdmin) {
                        admin = true;
                    }
                }
            }
            collect();
        });

        var collect = function() {
            if (admin) {
                db3.user.find({term: req.param('term')}, function(err, user) {
                    if (err || !user) {
                        console.log("Not found");
                        res.status(500).send("No users found under that term");
                    } else {
                        user.forEach(function(a) {
                            // Add to an array of user documents
                            fs.push(a);
                        });
                    }
                    returnFunction();
                });
            } else {
                res.status(500).send('User not an admin');
            }
        }

        var returnFunction = function() {
            if (fs.length > 0) {
                var all = '{"users":[';
                for (i = 0; i < fs.length; i++) {
                    if (i == fs.length - 1) {
                        all += JSON.stringify(fs[i]) + ']}';
                    } else {
                        all += JSON.stringify(fs[i]) + ',';
                    }
                }
                var rs = JSON.parse(all);
                res.send(rs);
            } else {
                res.status(500).send("No users found under that term");
            }
        }
    };

    /**
     *  Route for getting all the terms an admin is in charge of. This route
     *  checks that the user making the request to get all the terms the admin
     *  is in charge of is indeed an admin
     *  Type: GET
     *  Data: JSON
     *  →   {UID: String → UID of admin user}
     *  Response: JSON
     *  →   {term: [
                String → a term that the admin is in charge of,
                String → a term that the admin is in charge of,
                ...]}
     */
    self.routes['/getTerms'] = function (req, res) {
        var admin = false;
        var terms;
        var termsArr = [];

        db3.user.findOne({UID: req.param('UID')}, function(err, user) {
            if (err || !user) {
                res.status(500).send('User not found');
            } else {
                if (user != null) {
                    if (user.isAdmin) {
                        admin = true;
                    }
                }
            }
            collect();
        });

        var collect = function() {
            if (admin) {
                db3.user.findOne({UID: req.param('UID')}, function(err, user) {
                    if (err || !user) {
                        console.log("Not found");
                    } else {
                        terms = JSON.stringify(user.term);
                    }
                    returnFunction();
                });
            } else {
                res.status(500).send('User not an admin');
            }
        }

        var returnFunction = function() {
            var fs = '{"term":[';
            if (terms != null) {
                if (terms.slice(0,1) == '[') {
                    terms = terms.slice(1,-1);
                    termsArr = terms.split(',');
                    for (i = 0; i < termsArr.length; i++) {
                        if (i == termsArr.length - 1) {
                            fs += termsArr[i] + ']}';
                        } else {
                            fs += termsArr[i] + ',';
                        }
                    }
                } else {
                    fs += terms + ']}';
                }

                var fj = JSON.parse(fs);

                res.send(fj);
            } else {
                res.status(500).send("User has no terms");
            }
        }
    };

    /**
     *  Route for assigning terms to an admin user. This checks that the user
     *  being assigned the term is an admin. This route also allows to add on to
     *  the terms that the admin user may already be in charge of.
     *  Type: POST
     *  Data: JSON
     *  →   {UID: String → UID of admin,
     *       term: String → term to add to admin's term array}
     *  Response: NONE
     */
    self.routes['/createTerm'] = function (req, res) {
        var check;
        var currTerms = "";
        var currTermsArr = [];

        db3.user.findOne({UID: req.param('UID')}, function(err, user) {
            if (err || !user) {
                res.status(500).send("User not found!");
            } else {
                if (!user.isAdmin) {
                    res.status(500).send("User is not an Admin!");
                }
            }
            check = true;
            getTerms();
        });

        // Getting terms an admin already has
        var getTerms = function() {
            if (check == true) {
                db3.user.findOne({UID: req.param('UID')}, function(err, user) {
                    if (err || !user) {
                        // Shouldn't happen as first test will not allow this
                        res.status(500).send("User not found!");
                    } else {
                        if (user.term == null) {
                            //res.status(500).send("user.term == null");
                            // Admin has no terms yet, start new array
                            currTermsArr.push(req.param('term'));
                            addTerm();
                        } else if (JSON.stringify(user.term).slice(0,1) == "[") {
                            //res.status(500).send("term is an array");
                            currTerms = JSON.stringify(user.term);
                            currTerms = currTerms.slice(1, -1);
                            currTermsArr = currTerms.split(',');
                            for (i = 0; i < currTermsArr.length; i++) {
                                currTermsArr[i] = currTermsArr[i].slice(1,-1);
                            }
                            for (i = 0; i < currTermsArr.length; i++) {
                                if (currTermsArr[i] == req.param('term')) {
                                    res.status(500).send("This user is already in charge of this term!");
                                    return;
                                }
                            }
                            currTermsArr.push(req.param('term'));
                            addTerm();
                        } else {
                            //res.status(500).send("user.term is not an array or null");
                            // Shouldn't happen, but handling just in case
                            currTermsArr.push(JSON.stringify(user.term));
                            currTermsArr[0] = currTermsArr[0].slice(1,-1);
                            currTermsArr.push(req.param('term'));
                            addTerm();
                        }
                        //currTerms = JSON.stringify(term);
                        //currTerms = currTerms.slice(1, -1);
                    }

                });
            }
        }

        var addTerm = function() {
            var fs = '[';
            for (i = 0; i < currTermsArr.length; i++) {
                if (i == currTermsArr.length - 1) {
                    fs += '"' + currTermsArr[i] + '"]';
                } else {
                    fs += '"' + currTermsArr[i] + '",';
                }
            }
            var fj = JSON.parse(fs);
            //db3.user.update({UID: req.param('UID')}, { $push: { "term": {$each: currTermsArr} }});
            db3.user.update({UID: req.param('UID')}, { $set: { "term": fj }});
            res.send("Added term to user's list of terms");
        }
    };

    /**
     *  Route for verifying if a user is an admin
     *  Type: GET
     *  Data: JSON
     *  →   {UID: String → UID of user}
     *  Response: JSON
     *  →   {isAdmin: boolean → true=admin, false=student}
     */
    self.routes['/verifyAdmin'] = function (req, res) {
        var check;

        db3.user.findOne({UID: req.param('UID')}, function(err, user) {
            if (err || !user) {
                res.status(500).send("User not found");
            } else {
                if (user != null) {
                    if (user.isAdmin) {
                        check = true;
                    } else {
                        res.status(500).send("User is not an Admin!");
                    }
                } else {
                    res.status(500).send("User not found");
                }
            }
            returnFunction();
        });

        var returnFunction = function() {
            if (check == true) {
                var ret = '{"isAdmin": true}';
                var jo = JSON.parse(ret);

                res.send(jo);
            }
        }
    };

    /**
     *  Route for for counting categories and structure documents
     */
    /*self.routes['/countAll'] = function (req, res) {
        var string = "";
        var numcat = 0;
        var numstr = 0;

        db.categories.find(function(err, categories) {
            if (err || !categories) {
                console.log("Not found");
            } else {
                categories.forEach(function(a) {
                    numcat++;
                });
            }
            returnFunction();
        })
        db2.structure.find(function(err, structure) {
            if (err || !structure) {
                console.log("Not found");
            } else {
                structure.forEach(function(a) {
                    numstr++;
                });
            }
            returnFunction();
        });

        var returnFunction = function() {
            if (numcat > 0 && numstr > 0) {
                string = "categories: " + numcat + ", structure: " + numstr;
                res.send(string);
            }
        }
    };*/

    /**
     *  Route for getting three random categories from the categories
     *  collection and a random skeleton from the structure collection. Uses a
     *  random number generator to generate three random numbers that are used
     *  to search the database for those numbers that match a document's index.
     *  The range of the random number generators are determined by counting the
     *  total number of documents in each collection.
     *  Type: GET
     *  Data: {difficulty: String → desired difficulty of skeleton}
     *  Response: JSON
     *  →   {"categories": [
     *          {"_id": String → mongo unique id,
     *           "singular": String → singular form of the category,
     *           "plurarl": String → plural form of the category,
     *           "index": int → assigned value},
     *          {"_id": String → mongo unique id,
     *           "singular": String → singular form of the category,
     *           "plurarl": String → plural form of the category,
     *           "index": int → assigned value},
     *          {"_id": String → mongo unique id,
     *           "singular": String → singular form of the category,
     *           "plurarl": String → plural form of the category,
     *           "index": int → assigned value},
     *          {"premises": [
     *              String → premise 1 structure,
     *              String → premise 2 structure],
     *           "conclusion": String → conclusion structure}]}
     */
    /*self.routes['/problem'] = function(req, res) {
        // local variables
        var cat1;
        var cat2;
        var cat3;
        var skel;

        // getting max index values from each collection
        var numcat = 0;
        var numstr = 0;

        db.categories.find(function(err, categories) {
            if (err || !categories) {
                console.log("Not found");
            } else {
                categories.forEach(function(a) {
                    numcat++;
                });
            }
            getCategories();
        })
        db2.structure.find(function(err, structure) {
            if (err || !structure) {
                console.log("Not found");
            } else {
                structure.forEach(function(a) {
                    numstr++;
                });
            }
            getCategories();
        });

        var getCategories = function() {
            if (numcat > 0 && numstr > 0) {
                // generate 3 random numbers for categories
                    // Math.floor(Math.random() * (max - min) + min);
                var num1 = Math.floor(Math.random() * (numcat - 1) + 1);
                var num2 = Math.floor(Math.random() * (numcat - 1) + 1);
                var num3 = Math.floor(Math.random() * (numcat - 1) + 1);
                while (num1 == num2 || num1 == num3 || num2 == num3) {
                    num1 = Math.floor(Math.random() * (numcat - 1) + 1);
                    num2 = Math.floor(Math.random() * (numcat - 1) + 1);
                    num3 = Math.floor(Math.random() * (numcat - 1) + 1);
                }

                // generate 1 random number for skeleton
                var num4 = Math.floor(Math.random() * (numstr - 1) + 1);

                // retrieve three categories
                db.categories.find({index: num1}, function(err, categories) {
                    if (err || !categories) {
                        console.log("Not found");
                    } else {
                        categories.forEach(function(a) {
                            cat1 = a;
                        });
                    }
                    returnFunction();
                });
                db.categories.find({index: num2}, function(err, categories) {
                    if (err || !categories) {
                        console.log("Not found");
                    } else {
                        categories.forEach(function(a) {
                            cat2 = a;
                        });
                    }
                    returnFunction();
                });
                db.categories.find({index: num3}, function(err, categories) {
                    if (err || !categories) {
                        console.log("Not found");
                    } else {
                        categories.forEach(function(a) {
                            cat3 = a;
                        });
                    }
                    returnFunction();
                });

                // retreive problem skeleton
                db2.structure.find({index: num4}, function(err, structure) {
                    if (err || !structure) {
                        console.log("Not found");
                    } else {
                        structure.forEach(function(a) {
                            skel = a;
                        });
                    }
                    returnFunction();
                });
            }
        }

        // function to create JSON object and send in response
        var returnFunction = function() {
            if (cat1 != null && cat2 != null && cat3 != null && skel != null) {
                var s1 = JSON.stringify(cat1);
                var s2 = JSON.stringify(cat2);
                var s3 = JSON.stringify(cat3);
                var s4 = JSON.stringify(skel);
                var sf = '{"categories":[' +
                    s1 + ',' +
                    s2 + ',' +
                    s3 + ',' +
                    s4 + ']}';

                // Add skeleton in here

                var jArr = JSON.parse(sf);

                res.send(jArr);
            }
        }
    };*/
    self.routes['/problem'] = function (req, res) {
        // local variables
        var cat1;
        var cat2;
        var cat3;
        var skel;
        var temp = [];

        // if-else for with/without difficulty
        if (req.param('difficulty') == "easy" || req.param('difficulty') == "medium" || req.param('difficulty') == "hard") {
            // with difficulty
            var numcat = 0;
            var numstr = 0;
            var diff = true;

            db.categories.find(function(err, categories) {
                if (err || !categories) {
                    console.log("Not found");
                } else {
                    categories.forEach(function(a) {
                        numcat++;
                    });
                }
                if (numcat > 0 && numstr > 0) {
                    getCategories(numcat, numstr, diff);
                }
            });
            db2.structure.find({difficulty: req.param('difficulty')},function(err, structure) {
                if (err || !structure) {
                    console.log("Not found");
                } else {
                    structure.forEach(function(a) {
                        numstr++;
                        temp.push(a.index);
                    });
                }
                if (numcat > 0 && numstr > 0) {
                    getCategories(numcat, numstr, diff);
                }
            });
        } else {
            // without difficulty
            // Counting number of documents in each collection
            var numcat = 0;
            var numstr = 0;
            var diff = false;

            db.categories.find(function(err, categories) {
                if (err || !categories) {
                    console.log("Not found");
                } else {
                    categories.forEach(function(a) {
                        numcat++;
                    });
                }
                if (numcat > 0 && numstr > 0) {
                    getCategories(numcat, numstr, diff);
                }
            });
            db2.structure.find(function(err, structure) {
                if (err || !structure) {
                    console.log("Not found");
                } else {
                    structure.forEach(function(a) {
                        numstr++;
                    });
                }
                if (numcat > 0 && numstr > 0) {
                    getCategories(numcat, numstr, diff);
                }
            });
        }

        var getCategories = function(numcat, numstr, diff) {
            if (numcat > 0 && numstr > 0 && diff == false) {
                // generate 3 random numbers for categories
                    // Math.floor(Math.random() * (max - min) + min);
                var num1 = Math.floor(Math.random() * (numcat - 1) + 1);
                var num2 = Math.floor(Math.random() * (numcat - 1) + 1);
                var num3 = Math.floor(Math.random() * (numcat - 1) + 1);
                while (num1 == num2 || num1 == num3 || num2 == num3) {
                    num1 = Math.floor(Math.random() * (numcat - 1) + 1);
                    num2 = Math.floor(Math.random() * (numcat - 1) + 1);
                    num3 = Math.floor(Math.random() * (numcat - 1) + 1);
                }

                // generate 1 random number for skeleton
                var num4 = Math.floor(Math.random() * (numstr - 1) + 1);

                // retrieve three categories
                db.categories.find({index: num1}, function(err, categories) {
                    if (err || !categories) {
                        console.log("Not found");
                    } else {
                        categories.forEach(function(a) {
                            cat1 = a;
                        });
                    }
                    returnFunction();
                });
                db.categories.find({index: num2}, function(err, categories) {
                    if (err || !categories) {
                        console.log("Not found");
                    } else {
                        categories.forEach(function(a) {
                            cat2 = a;
                        });
                    }
                    returnFunction();
                });
                db.categories.find({index: num3}, function(err, categories) {
                    if (err || !categories) {
                        console.log("Not found");
                    } else {
                        categories.forEach(function(a) {
                            cat3 = a;
                        });
                    }
                    returnFunction();
                });

                // retreive problem skeleton
                db2.structure.find({index: num4}, function(err, structure) {
                    if (err || !structure) {
                        console.log("Not found");
                    } else {
                        structure.forEach(function(a) {
                            skel = a;
                        });
                    }
                    returnFunction();
                });
            } else if (numcat > 0 && numstr > 0 && diff == true) {
                // generate 3 random numbers for categories
                    // Math.floor(Math.random() * (max - min) + min);
                var num1 = Math.floor(Math.random() * (numcat - 1) + 1);
                var num2 = Math.floor(Math.random() * (numcat - 1) + 1);
                var num3 = Math.floor(Math.random() * (numcat - 1) + 1);
                while (num1 == num2 || num1 == num3 || num2 == num3) {
                    num1 = Math.floor(Math.random() * (numcat - 1) + 1);
                    num2 = Math.floor(Math.random() * (numcat - 1) + 1);
                    num3 = Math.floor(Math.random() * (numcat - 1) + 1);
                }

                // generate 1 random number for skeleton
                var n4 = Math.floor(Math.random() * (numstr - 1) + 1);
                var num4 = temp[n4 - 1];

                // retrieve three categories
                db.categories.find({index: num1}, function(err, categories) {
                    if (err || !categories) {
                        console.log("Not found");
                    } else {
                        categories.forEach(function(a) {
                            cat1 = a;
                        });
                    }
                    returnFunction();
                });
                db.categories.find({index: num2}, function(err, categories) {
                    if (err || !categories) {
                        console.log("Not found");
                    } else {
                        categories.forEach(function(a) {
                            cat2 = a;
                        });
                    }
                    returnFunction();
                });
                db.categories.find({index: num3}, function(err, categories) {
                    if (err || !categories) {
                        console.log("Not found");
                    } else {
                        categories.forEach(function(a) {
                            cat3 = a;
                        });
                    }
                    returnFunction();
                });

                // retreive problem skeleton
                db2.structure.find({index: num4}, function(err, structure) {
                    if (err || !structure) {
                        console.log("Not found");
                    } else {
                        structure.forEach(function(a) {
                            skel = a;
                        });
                    }
                    returnFunction();
                });
            }
        }

        // function to create JSON object and send in response
        var returnFunction = function() {
            if (cat1 != null && cat2 != null && cat3 != null && skel != null) {
                var s1 = JSON.stringify(cat1);
                var s2 = JSON.stringify(cat2);
                var s3 = JSON.stringify(cat3);
                var s4 = JSON.stringify(skel);
                var sf = '{"categories":[' +
                    s1 + ',' +
                    s2 + ',' +
                    s3 + ',' +
                    s4 + ']}';

                // Add skeleton in here

                var jArr = JSON.parse(sf);

                res.send(jArr);
            }
        }
    };

    /**
     *  Route for adding a category
     *  Type: POST
     *  Data: JSON
     *  →   {index: int → appropriate index,
     *       plural: String → category}
     *  Response: no response
     */
    /*self.routes['/addCategory'] = function (req, res) {
        var index = -1;
        var maxIndex = -1;

        // Find last index value
        db.categories.find({index: num1}, function(err, categories) {
            if (err || !categories) {
                console.log("Not found");
            } else {
                categories.forEach(function(a) {
                    if (a.index > maxIndex) {
                        maxIndex = a.index;
                    }
                });
            }

        });

        index = maxIndex;

        // Inserting the new category
        var insertDoc = function() {
            if (index >= 0) {
                db.categories.insert({
                    index: index,
                    plural: req.param('plural')
                });
            }
        }

        //res.send("Added category " + req.param('plural'));
    };*/

    /**
     *  Route for getting the score json object for a user
     *  Type: GET
     *  Data: JSON
     *  →   {"UID": String → UID of user}
     *  Response: JSON
     *  →   {"catright": int → # of category checks gotten right,
     *       "catwrong": int → # of category checks gotten wrong,
     *       "markright": int → # of markings submitted right,
     *       "markwrong": int → # of markings submitted wrong,
     *       "validright": int → # of conclusions answered right,
     *       "validwrong": int → # of conclusions answered wrong}
     */
    self.routes['/getScore'] = function (req, res) {
        var userObject;

        // Find user in database
        db3.user.find({UID: req.param('UID')}, function(err, user) {
            if (err || !user) {
                Console.log("User not found");
            } else {
                user.forEach(function(a) {
                    isThere = true;
                    userObject = a;
                });
            }
            returnFunction();
        });

        var returnFunction = function() {
            if (userObject != null) {
                res.send(userObject.score);
            }
        }
    };

    /**
     *  Route for testing the getScore route but with the user_id
     *  predefined as "dominno"
     */
    /*self.routes['/testGetScore'] = function (req, res) {
        var userObject;

        // Find user in database
        db3.user.find({onyen: "dominno"}, function(err, user) {
            if (err || !user) {
                Console.log("User not found");
            } else {
                user.forEach(function(a) {
                    userObject = a;
                });
            }
            returnFunction();
        });

        var returnFunction = function() {
            if (userObject != null) {
                res.send(userObject.score);
            }
        }
    };*/

    /**
     *  Route for updating scores for a user
     *  Type: POST
     *  Data: JSON
     *  →   {"UID": String → UID of user,
     *       "catright": boolean → boolean for category to be incremented,
     *       "catwrong": boolean → boolean for category to be incremented,
     *       "markright": boolean → boolean for category to be incremented,
     *       "markwrong": boolean → boolean for category to be incremented,
     *       "validright": boolean → boolean for category to be incremented,
     *       "validwrong": boolean → boolean for category to be incremented}
     *  Response: no response
     */
    self.routes['/postScore'] = function (req, res) {
        if (req.param('catright')) {
            db3.user.update({UID: req.param('UID')}, { $inc: { "score.catright": 1 }});
        } else if (req.param('catwrong')) {
            db3.user.update({UID: req.param('UID')}, { $inc: { "score.catwrong": 1 }});
        } else if (req.param('markright')) {
            db3.user.update({UID: req.param('UID')}, { $inc: { "score.markright": 1 }});
        } else if (req.param('markwrong')) {
            db3.user.update({UID: req.param('UID')}, { $inc: { "score.markwrong": 1 }});
        } else if (req.param('validright')) {
            db3.user.update({UID: req.param('UID')}, { $inc: { "score.validright": 1 }});
        } else if (req.param('validwrong')) {
            db3.user.update({UID: req.param('UID')}, { $inc: { "score.validwrong": 1 }});
        }
    };

    /**
     *  Route for testing the postScore route but with the user_id
     *  predefined as "dominno" and catright predefined as "true"
     */
    /*self.routes['/testPostScore'] = function (req, res) {
        db3.user.update({onyen: "dominno"}, { $inc: { "score.catright": 1 }});

        res.send("Updated score");
    };*/

    // TESTING REQUIRED
    /**
     *  Route for giving a user admin access
     *  Type: POST
     *  Data: JSON
     *  →   {onyen: String → onyen of the user to be given admin access}
     *  Response: no response
     */
    self.routes['/makeAdmin'] = function (req, res) {
        db3.user.findOne({onyen: req.param('onyen')}, function(err, user) {
            if (err || !user) {
                isThere = false;
            } else {
                if (user != null) {
                    isThere = true;
                    userObject = user;
                } else {
                    isThere = false;
                }
            }
            if(isThere){
                makeAdmin();
            } else{
                res.status(500).send('User not found');
                res.end();
            }

        });
        var makeAdmin = function(){
            db3.user.update({onyen: req.param('onyen')}, { $set: { "isAdmin": true }});
            res.send("Updated access");
        }
    };

    /**
     *  Route for revoking a user admin access
     *  Type: POST
     *  Data: JSON
     *  →   {onyen: String → onyen of the user to be revoked admin access}
     *  Response: no response
     */
    self.routes['/removeAdmin'] = function (req, res) {
        db3.user.findOne({onyen: req.param('onyen')}, function(err, user) {
            if (err || !user) {
                isThere = false;
            } else {
                if (user != null) {
                    isThere = true;
                    userObject = user;
                } else {
                    isThere = false;
                }
            }
            if(isThere){
                if(req.param('onyen') === 'neta'){
                    res.status(500).send("Can't revoke access from Neta");
                    res.end()
                } else{
                    revokeAdmin();
                }
            } else{
                res.status(500).send('User not found');
                res.end();
            }

        });
        var revokeAdmin = function(){
            db3.user.update({onyen: req.param('onyen')}, { $set: { "isAdmin": false }});
            db3.user.update({onyen: req.param('onyen')}, { $set: { "term": "" }});
            res.send("Updated access");
        }
    };

    /**
     *  Route for testing. Used to find the variable that holds the request
     *  data
     */
    /*self.routes['/testReqBody'] = function (req, res) {
        //console.log(req.body);
        //res.send(req.body);
        res.json(req.param('user_id'));
        //res.json(req.body.user_id);
    };*/

    // Assigning express to the app
    self.app  = express();

    // Allowing server to access request data
    self.app.use(express.bodyParser());

    // Serving static files
    self.app.use('/js', express.static(__dirname+'/client/js'));
    self.app.use('/css', express.static(__dirname+'/client/css'));
    self.app.use('/img', express.static(__dirname+'/client/img'));
    self.app.use('/fonts', express.static(__dirname+'/client/fonts'));

    // Allowing cross-domain ajax calls
    self.app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin","*");
        res.header("Access-Control-Allow-Headers","Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    // Register the handlers
    self.app.get('/asciimo', self.routes['/asciimo']);
    self.app.get('/', self.routes['/']);
    self.app.get('/admin.html', self.routes['/admin.html']);
    self.app.get('/user', self.routes['/user']);
    self.app.get('/assignTerm', self.routes['/assignTerm']);
    self.app.get('/getTerm', self.routes['/getTerm']);
    self.app.get('/getTerms', self.routes['/getTerms']);
    self.app.get('/createTerm', self.routes['/createTerm']);
    self.app.get('/verifyAdmin', self.routes['/verifyAdmin']);
    //self.app.get('/countAll', self.routes['/countAll']);
    self.app.get('/problem', self.routes['/problem']);
    //self.app.get('/addCategory', self.routes['/addCategory']);
    self.app.get('/getScore', self.routes['/getScore']);
    //self.app.get('/testGetScore', self.routes['/testGetScore']);
    self.app.get('/postScore', self.routes['/postScore']);
    //self.app.get('/testPostScore', self.routes['/testPostScore']);
    self.app.get('/makeAdmin', self.routes['/makeAdmin']);
    self.app.get('/removeAdmin', self.routes['/removeAdmin']);
    //self.app.get('/testReqBody', self.routes['/testReqBody']);

    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function(){
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.ipaddr, function(){
            console.log('%s: Node server started on %s:%d ...', Date(Date.now()), self.ipaddr, self.port);
        });
    };
};

/**
 *  main(): Main code.
 */
var zapp = new SampleApp();
zapp.setupVariables();
zapp.populateCache();
zapp.setupTerminationHandlers();
zapp.start();
