Pod::Spec.new do |s|
  s.name = 'Leopard-iOS'
  s.module_name = 'Leopard'
  s.version = '1.0.0'
  s.license = {:type => 'Apache 2.0'}
  s.summary = 'iOS SDK for Picovoice\'s Leopard speech-to-text engine.'
  s.description = 
  <<-DESC
  Leopard is an on-device speech-to-text engine.
  
  Leopard is:
    - private, all voice processing runs locally.
    - Accurate
    - compact and computationally-Efficient
    - cross-platform:
      - Linux (x86_64)
      - macOS (x86_64, arm64)
      - Windows (x86_64)
      - Android
      - iOS
      - Raspberry Pi (4, 3)
      - NVIDIA Jetson Nano
  DESC
  s.homepage = 'https://github.com/Picovoice/leopard/tree/master/binding/ios'
  s.author = { 'Picovoice' => 'hello@picovoice.ai' }
  s.source = { :git => "https://github.com/Picovoice/leopard.git", :tag => "Leopard-iOS-v1.0.0" }
  s.ios.deployment_target = '9.0'
  s.swift_version = '5.0'
  s.vendored_frameworks = 'lib/ios/PvLeopard.xcframework'
  s.source_files = 'binding/ios/*.{swift}'
  s.excluded_files = 'binding/ios/LeopardAppTest/**'
end
