
import gulp from 'gulp';
import fs from 'fs/promises';
import uglify from 'gulp-uglify';
import rename from 'gulp-rename';

let manifest = JSON.parse(await fs.readFile("manifest.json"));
let currentVersion = manifest.version;

function minifyJs() {
    return gulp.src(['src/inject/js/*.js'], { base: "." }) // Source files
        .pipe(uglify()) // Minify the JavaScript
        .pipe(rename({ extname: '.min.js' })) // Rename the output file
        .pipe(gulp.dest('dist')); // Destination folder
}

gulp.task('minify-js', minifyJs);

gulp.task('default', gulp.series('minify-js')); // Default task

gulp.task("build", gulp.series('default'));