const { argv } = require('yargs');
const gulp = require('gulp');
const terser = require('gulp-terser');
const headerfooter = require('gulp-headerfooter');
const deleteLines = require('gulp-delete-lines');
const rename = require('gulp-rename');
const stripDebug = require('gulp-strip-debug');
const fs = require('fs');
const jscrush = require('./lib/jscrush');
const crunchme = require('./lib/crunchme');
const jssfx = require('./lib/jssfx')
const packify = require('./lib/ba-packify');
const regpack = require('./lib/regpack');

/**
 * Build without any compression (just merge files)
 */
gulp.task('build_raw', () => {

  const files = [
    './src/index.js',
  ];

  const header = fs.readFileSync('./src/header.html');
  const footer = fs.readFileSync('./src/footer.html');

  return gulp.src(files)
    .pipe(deleteLines({
      'filters': [
      /PRODUCTION/i, // Strip out lines only meant for production build
      ]
    }))
    .pipe(headerfooter.header(header))
    .pipe(headerfooter.footer(footer))
    .pipe(rename('index.html'))
    .pipe(gulp.dest('./build'));
});

/**
 * Development build
 */
gulp.task('build_development', () => {
  const options = {};

  const files = [
    './src/index.js',
  ];

  const header = fs.readFileSync('./src/header.html');
  const footer = fs.readFileSync('./src/footer.html');

  return gulp.src(files)
    .pipe(deleteLines({
      'filters': [
      /PRODUCTION/i, // Strip out lines only meant for production build
      ]
    }))
    .pipe(terser(options))
    .pipe(headerfooter.header(header))
    .pipe(headerfooter.footer(footer))
    .pipe(rename('index.html'))
    .pipe(gulp.dest('./build'));
});

/**
 * Production build
 */
gulp.task('build_production', () => {
  // Terser configuration can be viewed https://github.com/terser-js/terser#minify-options.
  const options = {
    toplevel: true,
    compress: {
      // https://github.com/terser-js/terser#compress-options
      toplevel: true,
      booleans_as_integers: true,
      ecma: 6, // try 5
      keep_fargs: false,
      pure_getters: true,
      passes: 4,
      arguments: true,
      hoist_funs: true,
      unsafe: true,
    },
    output: {
      quote_style: 3,
    },
    mangle: {
      reserved: ['r', 's', '_', 'Y', '$']
    }
  };

  const files = [
    './src/index.js',
  ];

  const header = fs.readFileSync('./src/header.html');
  const footer = fs.readFileSync('./src/footer.html');

  return gulp.src(files)
    .pipe(deleteLines({
      'filters': [
      /DEBUG/i, // Strip out lines only meant for development build
      ]
    }))
    .pipe(stripDebug()) // There actually is an npm package just for removing console.log's from your source
    .pipe(terser(options)) // Minify with Terser
    //.pipe(jscrush()) // Compress with JSCrush (excellent compression but sometimes produces output which won't unpack properly)
    //.pipe(packify()) // Compress with ba-packify
    //.pipe(crunchme()) // Compress with crunchme
    //.pipe(jssfx()) // Compress with jssfx (be patient, this one is slow!)
    .pipe(regpack()) // Some new thing, seems awesome compared to every other compressor I tried
    .pipe(headerfooter.header(header))
    .pipe(headerfooter.footer(footer))
    .pipe(rename('index.html'))
    .pipe(gulp.dest('./build'));
});

/**
 * Display file size information
 */
gulp.task('filesize', (cb) => {
  const targetSize = 4096;
  const stats = fs.statSync('./build/index.html');
  const fileSizeInBytes = stats.size;
  if (fileSizeInBytes < targetSize) {
    console.log(`Output is now \x1b[32m\x1b[1m${fileSizeInBytes}\x1b[0m bytes`);
  } else if(fileSizeInBytes === targetSize) {
    console.log(`Output is now \x1b[32m\x1b[1m${fileSizeInBytes}\x1b[0m bytes`);
  } else {
    console.log(`Output is now \x1b[31m\x1b[5m\x1b[1m${fileSizeInBytes}\x1b[0m bytes`);
  }
  return cb();
});

/**
 * Automagic rebuild on save
 */
gulp.task('watch', () => {
  const watcher = gulp.watch('./src/*', gulp.series('build'));
  return watcher.on('change', event => {
    console.log(`File ${event.path} was ${event.type}, running tasks...`);
  });
});

/**
 * Automagic production build watcher
 */
gulp.task('prod_watch', () => {
  const watcher = gulp.watch('./src/*', gulp.series('prod'));
  return watcher.on('change', event => {
    console.log(`File ${event.path} was ${event.type}, running tasks...`);
  });
});

/**
 * Queued tasks
 */
gulp.task('build', gulp.series('build_development', 'filesize'));
gulp.task('prod', gulp.series('build_production', 'filesize'));
