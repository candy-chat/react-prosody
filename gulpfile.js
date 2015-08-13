'use strict';

var gulp = require('gulp');
var runSequence = require('run-sequence');
var browserSync = require('browser-sync').create();
var historyApiFallback = require('connect-history-api-fallback');
var browserify = require('browserify');
var watchify = require('watchify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var del = require('del');
var extend = require('lodash/object/extend');

var $ = require('gulp-load-plugins')();

var srcDir = './app/components/';
var buildDir = './public/';

gulp.task('js', function() {
    return buildScript('app.jsx');
});

gulp.task('default', function () {
    buildScript('app.jsx', true);
})

function buildScript(file, watch) {
    var props = extend({}, watchify.args, {
        entries: [srcDir + file],
        debug: true,
        extensions: ['.js', '.jsx']
    });

    var bblfy = babelify.configure({
        only: /(app)/
    });

    var brwsfy = browserify(props).transform(bblfy);

    var bundler = watch ? watchify(brwsfy, {
        ignoreWatch: true
    }) : brwsfy;

    function rebundle() {
        return bundler.bundle()
            .on('error', handleError)
            .pipe(source('app.js'))
            .pipe(buffer())
            .pipe($.sourcemaps.init({ loadMaps: true }))
            .pipe($.sourcemaps.write('./maps'))
            .pipe(gulp.dest(buildDir));
    }

    bundler.on('update', rebundle);
    bundler.on('log', $.util.log);
    bundler.on('error', $.util.log);
    return rebundle();
}

function handleError() {
    $.util.beep();
    $.notify.onError({
        title: 'Compile Error',
        message: '<%= error.message %>'
    }).apply(this, arguments);

    // Keep gulp from hanging on this task
    this.emit('end');
}
