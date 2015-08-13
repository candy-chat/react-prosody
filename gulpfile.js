var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();

gulp.task('js', function() {
  // vendor.js
  gulp.src([
      './app/vendor/jquery/jquery.js',

      './app/vendor/react/JSXTransformer.js',
      './app/vendor/react/react.js',
      './app/vendor/reflux/dist/reflux.js',
      './app/vendor/react-router/build/umd/ReactRouter.js',

      './app/vendor/strophe/strophe.js',
      './app/vendor/strophejs-plugins/muc/strophe.muc.js',
      './app/vendor/strophejs-plugins/roster/strophe.roster.js',
      './app/vendor/strophejs-plugins/disco/strophe.disco.js',
      './app/vendor/strophejs-plugins/caps/strophe.caps.jsonly.js',
    ])
    .pipe(plugins.concat('vendor.js'))
    .pipe(gulp.dest('./public/js/'));

    // candy.js
    gulp.src([
            './app/js/candy/candy.js',
            './app/js/candy/core.js',
            './app/js/candy/view.js',
            './app/js/candy/util.js',
            './app/js/candy/core/action.js',
            './app/js/candy/core/chatRoom.js',
            './app/js/candy/core/chatRoster.js',
            './app/js/candy/core/chatUser.js',
            './app/js/candy/core/contact.js',
            './app/js/candy/core/event.js',
        ])
        .pipe(plugins.concat('candy.js'))
        .pipe(gulp.dest('./public/js/'));


    // app_components.js
    gulp.src([
      './app/mixins/**/*',
      './app/shared/**/*',
      './app/components/**/*',
      ])
        .pipe(plugins.concat('app_components.js'))
        .pipe(gulp.dest('./public/js/'));
});

