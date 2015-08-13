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
            './app/vendor/candy/candy.js',
            './app/vendor/candy/core.js',
            './app/vendor/candy/view.js',
            './app/vendor/candy/util.js',
            './app/vendor/candy/core/action.js',
            './app/vendor/candy/core/chatRoom.js',
            './app/vendor/candy/core/chatRoster.js',
            './app/vendor/candy/core/chatUser.js',
            './app/vendor/candy/core/contact.js',
            './app/vendor/candy/core/event.js',
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

