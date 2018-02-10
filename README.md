# nemo-runner

Wrapper to run nemo/mocha suites

## Getting started

Install nemo-runner and nemo

```sh
npm install --save-dev nemo nemo-runner@https://github.com/samonkoba/nemo-runner.git#latestReleaseDataFilter
```

Install chromedriver and GeckoDriver to your $PATH

Add tests directory structure

```
test
    functional
        config
            config.json
        spec
            spec.js
```

`config.json`

```js
{
  "driver": {
    "browser": "phantomjs"
  },
  "data": {
    "baseUrl": "http://localhost:8000"
  },
  "profiles": {
    "base": {
      "tests": "path:spec/*.js",
      "env": {
        "DEBUG": "nemo*"
      },
      "mocha": {
        "timeout": 180000,
        "retries": 0,
        "require": "babel-register",
        "grep": "argv:grep"
      }
    },
    "chrome": {
      "driver": {
        "browser": "chrome"
      }
    },
    "firefox": {
      "driver": {
        "browser": "firefox"
      }
    }
  }
}
```

`spec.js`

```js
describe('@foo@', _ => {
    it('should @success@fully load a URL', async function () {
        let nemo = this.nemo;
        await nemo.driver.get(nemo.data.baseUrl);
        await nemo.driver.sleep(3000);
    });
});
describe('@bar@', _ => {
    it('should @fail@ to load a URL', async function () {
        let nemo = this.nemo;
        await nemo.driver.get('http://localhost/does/not/exist');
        await nemo.driver.sleep(3000);
    });
});
```

Add run script(s) to package.json (you can also just run the full command directly but this is cleaner)

```js
"scripts": {
    "start": "node index.js",
    "nemo": "nemo-runner -B test/functional -P firefox,chrome -G @foo@,@bar@",
    "nemo:debug": "nemo-runner --inspect --debug-brk -B test/functional -P firefox -G @foo@"
},
```

Give it a try

```sh
npm run nemo
```

You should have seen two Firefox and two Chrome browser instances open and execute the scripts.

## CLI arguments

```sh
  Usage: _nemo-runner [options]

  Options:

    -h, --help                   output usage information
    -V, --version                output the version number
    -B, --base-directory <path>  parent directory for config/ and spec/ (or other test file) directories. relative to cwd
    -P, --profile [profile]      which profile(s) to run, out of the configuration
    -G, --grep <pattern>         only run tests matching <pattern>
            <pattern>            A pattern can either be a testcase name, test case script js file or path to testcase scripts
                                   example : -G test_themes_property_file or -G pat/to/test/file.js or -G path/to/test/
    -L,                          Run tests for a given locale or locales example: -L en_US,en_KE
    -M                           Run tests with a specific test data file example: -M path/to/test/data/file.json
    -F, --file                   run parallel by file
    -D, --data                   run parallel by data
    --debug-brk                  enable node's debugger breaking on the first line
    --inspect                    activate devtools in chrome
    --no-timeouts                remove timeouts in debug/inspect use case

```

## Profile options

### `base`

is the main profile configuration that others will merge into

### `base.tests`

is an absolute path based glob pattern. (e.g. `"tests": "path:spec/!(wdb)*.js",`)

### `base.parallel`

only valid for 'base'.

- if set to 'file' it will create a child process for each mocha file (alternative to `-F` CLI arg)
- if set to 'data' it will create a child process for each object key under `base.data` (alternative to the `-D` CLI arg)

### `base.reports`

Recommended to set this as `path:report`, which will create a `report` directory beneath your base directory. See `Reporting` below.

### `base.mocha`

mocha options. described elsewhere

### `base.env`

any environment variables you want in the test process

### `base.maxConcurrent`

a number which represents the max limit of concurrent suites nemo-runner will execute in parallel - if not provided there is no limit

## Reporting

Recommended reporters are `mochawesome` or `xunit`. If you use either of these, `nemo-runner` will generate timestamped directories for each run.
 The reports will be further separated based on the parallel options. E.g.

![50%](static/report-output.png)

In the above example, parallel options were "profile", "file", and "data".

A summary for all parallel instances can be found at `summary.json`

### Screenshots

`nemo-runner` will take a screenshot automatically after each test execution (pass or fail). The screenshots will be 
named based on the respective test name. E.g. `my awesome test.after.png`.

You can use `nemo.runner.snap()` at any point in a test, to grab a screenshot. These screenshots will be named based on 
the respective test name, and number of screenshots taken using `nemo.runner.snap()`. E.g.
- `my awesome test.1.png`
- `my awesome test.2.png`
- `my awesome test.3.png`

If you use the `mochawesome` reporter, you will see these screeshots in the `Additional Context` section of the html report.

## Adding Nemo into the mocha context and vice versa

nemo-runner injects a `nemo` instance into the Mocha context (for it, before, after, etc functions) which can be accessed by
`this.nemo` within the test suites.

nemo-runner also adds the current test's context to `nemo.mocha`. That can be useful if you want to access or modify the test's context from within a nemo plugin.
### Parallel functionality

nemo-runner will execute in parallel `-P (profile)` x `-G (grep)` mocha instances. The example above uses "browser" as the
profile dimension and suite name as the "grep" dimension. Giving 2x2=4 parallel executions.

In addition to `profile` and `grep`, are the dimensions `file` and `data`.

#### Parallel by `file`

`file` will multiply the existing # of instances by the # of files selected by your configuration.

#### Parallel by `data`

`data` will multiply the existing # of instances by the # of keys found under `profiles.base.data`. It can also be overriden per-profile. It will also replace 
 `nemo.data` with the value of each keyed object. In other words, you can use this to do parallel, data-driven testing.
 
If you have the following base profile configuration:

```json
  "test_themes_property_file": {
      "product": "p2nodeweb",
      "default": {
        ...
      },
      "locales": {
        "en_BE,en_AR,en_SA": {
          "sender": {
            "type": "personal"
          },
          "receiver": {
            "type": "personal"
          }
        }
      },
      "tests": "path:spec/**/themes.js"
    }
```

Then the following test will run thrice for en_BE, en_AR and en_SA (in parallel) with corresponding values of `nemo.data.url`:

```js
it('test_themes_property_file', function () {
    var nemo = this.nemo;
    return nemo.driver.get(nemo.data.url);//runs once with paypal.com, once with paypal.fr
});
```

### CLI running examples

Here are example of running testcases 

```sh
 $ node_modules/.bin/nemo-runner -B tests/functional/ -G test_themes_property_file
 $ node_modules/.bin/nemo-runner -B tests/functional/ -G path/to/test/file.js
 $ node_modules/.bin/nemo-runner -B tests/functional/ -G path/to/tests/
 
 
 $ node_modules/.bin/nemo-runner -B tests/functional/ -G path/to/tests/ -L en_US,en_GB
 
 
 $ node_modules/.bin/nemo-runner -B tests/functional/ -G path/to/tests/ -M path/to/test/data/file.json
 
 
```
#### Parallel reporting

Using a reporter which gives file output will be the most beneficial. `nemo-runner` comes out of the box, ready to use `mochawesome` or `xunit` for outputting a report per parallel instance.


### Mocha options

The properties passed in to the `"mocha"` property of `config.json` will be applied to the `mocha` instances that are created. In general, these properties correlate with the `mocha` command line arguments. E.g. if you want this:

```sh
mocha --timeout 180000
```

You should add this to the `"mocha"` property within `"profiles"` of `config.json`:

```json
"profile": {
	...other stuff,
	"mocha": {
		"timeout": 180000
	}
}
```

`nemo-runner` creates `mocha` instances programmatically. Unfortunately, not all `mocha` command line options are available when instantiating it this way. One of the arguments that is **not** supported is the `--require` flag, which useful if you want to `require` a module, e.g. `babel-register` for transpilation. Thus, we added a `"require"` property in `config.json`, which takes a string of a single npm module name, or an array of npm module names. If it is an array, `nemo-runner` will `require` each one before instantiating the `mocha` instances.
