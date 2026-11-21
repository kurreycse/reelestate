plugins {
    id("com.android.application")
}

android {
    namespace = "in.co.reelestate.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "in.co.reelestate.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        val configuredUrl = providers.gradleProperty("appUrl")
            .orElse("https://reelestate.co.in")
            .get()
        buildConfigField("String", "APP_URL", "\"$configuredUrl\"")
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }
}

