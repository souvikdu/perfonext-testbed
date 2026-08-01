// Replaces react-scan/lite in builds that are not for the render lane.
// Without this the build lane would measure the instrumentation library instead of
// the app, and every route's byte count would be wrong.
exports.instrument = function instrument() {};
