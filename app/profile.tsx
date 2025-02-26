import Colors from "@/constants/Colors";
import React from "react";

import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
} from "react-native";

const Profile = () => {



  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text>
          Profile
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.light.background
  },
  content: {
    marginTop: 24
  }
});

export default Profile;