// Minimal React Native mock for testing
const React = require('react');

function createComponent(name: string) {
  const Comp = (props: any) => React.createElement(name, props, props.children);
  Comp.displayName = name;
  return Comp;
}

module.exports = {
  View: createComponent('View'),
  Text: createComponent('Text'),
  TextInput: createComponent('TextInput'),
  Pressable: createComponent('Pressable'),
  ScrollView: createComponent('ScrollView'),
  FlatList: createComponent('FlatList'),
  Image: createComponent('Image'),
  Modal: createComponent('Modal'),
  ActivityIndicator: createComponent('ActivityIndicator'),
  KeyboardAvoidingView: createComponent('KeyboardAvoidingView'),
  StyleSheet: { create: (styles: any) => styles, hairlineWidth: 0.5 },
  Platform: { OS: 'ios', select: (obj: any) => obj.ios || obj.default },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }) },
  Alert: { alert: jest.fn() },
  Animated: {
    View: createComponent('AnimatedView'),
    Value: jest.fn(() => ({ interpolate: jest.fn() })),
  },
  StatusBar: createComponent('StatusBar'),
  NativeModules: {},
};
