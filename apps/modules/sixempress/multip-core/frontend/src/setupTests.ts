import './tests/setup-sett';
import './tests/test-chain';
import '@testing-library/jest-dom';

tt.setupAuth();

tt.setupContext();

tt.setupRouter();

tt.setupLocations([ {_id: "location_1", name: "location_1", isActive: true} ], 0);

tt.setFetchResponse({_id: "test-id"});

tt.setupMultip();

HTMLMediaElement.prototype.play = async () => {};
