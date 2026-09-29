import assert from 'node:assert/strict';
import test from 'node:test';

import {
    SATELLITE_SIZE_SCALE_DEFAULT,
    SATELLITE_SIZE_SCALE_MIN,
    SATELLITE_SIZE_SCALE_MAX
} from '../js/config.js';
import { createI18n } from '../js/i18n.js';
import { createLaunchUtils } from '../js/launch-utils.js';
import {
    SATCAT_OWNER_LABELS,
    SATELLITE_NAME_OPERATOR_PROFILES
} from '../js/satellite-profile-data.js';
import {
    findSatelliteHit,
    horizontalCoordinatesFromDisplayVector,
    lookAnglesFromGeodetic,
    normalizeDegrees
} from '../js/sky-view.js';
import {
    alignPoseToHeading,
    calibrationDeltaFromPixels,
    cameraProjectionForViewport,
    directionFromAzimuthElevation,
    multiplyQuaternions,
    projectWorldDirection,
    quaternionFromDeviceOrientation,
    viewAnglesFromPose
} from '../js/sky-projection.js';
import { SOLAR_ECLIPSES, nextSolarEclipse, eclipseCountdownDays } from '../js/solar-eclipses.js';

test('configuration keeps the default satellite scale inside its supported range', () => {
    assert.ok(SATELLITE_SIZE_SCALE_DEFAULT >= SATELLITE_SIZE_SCALE_MIN);
    assert.ok(SATELLITE_SIZE_SCALE_DEFAULT <= SATELLITE_SIZE_SCALE_MAX);
});

test('solar eclipse catalog selects the upcoming NASA path and exposes valid geometry', () => {
    const eclipse = nextSolarEclipse(Date.UTC(2026, 7, 2));

    assert.equal(eclipse?.id, '2026-08-12-total');
    assert.equal(eclipseCountdownDays(eclipse, Date.UTC(2026, 7, 2)), 11);
    assert.ok(eclipse.path.length >= 20);
    assert.ok(eclipse.path.every((sample) =>
        [sample.north, sample.south, sample.center].every(([lat, lon]) =>
            Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
        )
    ));
    assert.equal(nextSolarEclipse(SOLAR_ECLIPSES[0].partialEndMs + 1), null);
});

test('i18n switches languages and interpolates placeholders', () => {
    let language = 'de';
    const i18n = createI18n(() => language);

    assert.equal(i18n.t('common.unknown'), 'Unbekannt');
    assert.equal(i18n.t('age.minutes', { count: 3 }), '3 min alt');

    language = 'en';
    assert.equal(i18n.t('common.unknown'), 'Unknown');
    assert.equal(i18n.translateDataLabel('Deutschland'), 'Germany');
});

test('satellite profile lookup data exposes key catalog mappings', () => {
    assert.equal(SATCAT_OWNER_LABELS.US, 'USA');
    const starlink = SATELLITE_NAME_OPERATOR_PROFILES.find(([pattern]) => pattern.test('STARLINK-1234'));
    assert.deepEqual(starlink?.slice(1), ['SpaceX', 'USA']);
});

test('launch helpers normalize status, coordinates, and YouTube URLs', () => {
    const launch = createLaunchUtils((key) => key);
    const successful = {
        id: 'demo-1',
        status: 'Launch successful',
        latitude: '28.5721',
        longitude: '-80.6480'
    };

    assert.equal(launch.launchKey(successful), 'demo-1');
    assert.equal(launch.classifyLaunchStatus(successful), 'success');
    assert.equal(launch.isEarthLaunch(successful), true);
    assert.match(launch.formatCoordinates(successful), /28\.57.*N.*80\.65.*W/);
    assert.equal(
        launch.youtubeEmbedUrl('https://www.youtube.com/watch?v=abc123'),
        'https://www.youtube.com/embed/abc123?rel=0'
    );
});

test('sky view normalizes headings and finds a satellite directly overhead', () => {
    assert.equal(normalizeDegrees(-10), 350);
    assert.equal(normalizeDegrees(725), 5);

    const overhead = lookAnglesFromGeodetic(
        { lat: 0, lon: 0, altitudeKm: 0 },
        { lat: 0, lon: 0, altitudeKm: 500 }
    );
    assert.ok(overhead);
    assert.ok(overhead.elevation > 89.9);
    assert.ok(overhead.rangeKm > 499 && overhead.rangeKm < 501);
});

test('W3C device-orientation quaternion points the rear camera at ground, horizon, and sky', () => {
    const north = viewAnglesFromPose(quaternionFromDeviceOrientation({ alpha: 0, beta: 90, gamma: 0 }));
    const east = viewAnglesFromPose(quaternionFromDeviceOrientation({ alpha: 270, beta: 90, gamma: 0 }));
    const ground = viewAnglesFromPose(quaternionFromDeviceOrientation({ alpha: 0, beta: 0, gamma: 0 }));
    const sky = viewAnglesFromPose(quaternionFromDeviceOrientation({ alpha: 0, beta: 180, gamma: 0 }));

    assert.ok(north && east && ground && sky);
    assert.ok(Math.abs(north.heading) < 1e-9);
    assert.ok(Math.abs(north.elevation) < 1e-9);
    assert.ok(Math.abs(east.heading - 90) < 1e-9);
    assert.ok(Math.abs(east.elevation) < 1e-9);
    assert.ok(ground.elevation < -89.9);
    assert.ok(sky.elevation > 89.9);
});

test('camera intrinsics account for object-fit cover cropping in portrait mode', () => {
    const projection = cameraProjectionForViewport({
        width: 390,
        height: 844,
        videoWidth: 480,
        videoHeight: 640,
        horizontalFov: 68
    });

    assert.ok(projection.focalLengthX > 460 && projection.focalLengthX < 480);
    assert.deepEqual(projection.matrix.slice(6), [0, 0, 1]);
});

test('3D pose projection responds one-to-one to horizontal turns', () => {
    const projection = cameraProjectionForViewport({ width: 400, height: 800, videoWidth: 400, videoHeight: 800 });
    const northPose = quaternionFromDeviceOrientation({ alpha: 0, beta: 90, gamma: 0 });
    const eastPose = quaternionFromDeviceOrientation({ alpha: 270, beta: 90, gamma: 0 });
    const northTarget = directionFromAzimuthElevation(0, 0);
    const eastTarget = directionFromAzimuthElevation(90, 0);
    const tenDegreesRight = directionFromAzimuthElevation(10, 0);

    const northCenter = projectWorldDirection(northTarget, northPose, projection);
    const eastCenter = projectWorldDirection(eastTarget, eastPose, projection);
    const rightPoint = projectWorldDirection(tenDegreesRight, northPose, projection);

    assert.ok(northCenter && eastCenter && rightPoint);
    assert.ok(Math.abs(northCenter.x - 200) < 1e-9);
    assert.ok(Math.abs(eastCenter.x - 200) < 1e-9);
    assert.ok(rightPoint.x > northCenter.x);
});

test('camera roll rotates the overlay without changing the optical-axis heading', () => {
    const northPose = quaternionFromDeviceOrientation({ alpha: 0, beta: 90, gamma: 0 });
    const halfRoll = 45 * Math.PI / 360;
    const rolledPose = multiplyQuaternions(northPose, {
        x: 0,
        y: 0,
        z: Math.sin(halfRoll),
        w: Math.cos(halfRoll)
    });
    const view = viewAnglesFromPose(rolledPose);
    const projection = cameraProjectionForViewport({ width: 400, height: 800, videoWidth: 400, videoHeight: 800 });
    const point = projectWorldDirection(directionFromAzimuthElevation(0, 10), rolledPose, projection);

    assert.ok(view && point);
    assert.ok(Math.abs(view.heading) < 1e-9);
    assert.ok(Math.abs(view.elevation) < 1e-9);
    assert.ok(point.x > projection.centerX);
    assert.ok(point.y < projection.centerY);
});

test('compass alignment and calibration are rotations, not axis scaling', () => {
    const northPose = quaternionFromDeviceOrientation({ alpha: 0, beta: 90, gamma: 0 });
    const aligned = alignPoseToHeading(northPose, 45);
    const alignedView = viewAnglesFromPose(aligned);
    const projection = cameraProjectionForViewport({ width: 400, height: 800, videoWidth: 400, videoHeight: 800 });
    const delta = calibrationDeltaFromPixels(projection.focalLengthX * Math.tan(10 * Math.PI / 180), 0, projection);

    assert.ok(alignedView);
    assert.ok(Math.abs(alignedView.heading - 45) < 1e-9);
    assert.ok(Math.abs(delta.yaw - 10) < 1e-9);
    assert.equal(delta.pitch, 0);
});

test('sky view selects only satellites inside a marker hit area', () => {
    const satellite = { id: '25544', name: 'ISS' };
    const hitTargets = [{ target: satellite, x: 120, y: 240, radius: 28 }];

    assert.equal(findSatelliteHit(hitTargets, 130, 245), satellite);
    assert.equal(findSatelliteHit(hitTargets, 170, 245), null);
});

test('sky view converts display-space celestial vectors to finite horizon coordinates', () => {
    const result = horizontalCoordinatesFromDisplayVector(
        { x: 0, y: 0, z: -1 },
        { lat: 52.52, lon: 13.405 },
        Date.UTC(2026, 6, 28, 12, 0, 0)
    );

    assert.ok(result);
    assert.ok(result.azimuth >= 0 && result.azimuth < 360);
    assert.ok(result.elevation >= -90 && result.elevation <= 90);
});
