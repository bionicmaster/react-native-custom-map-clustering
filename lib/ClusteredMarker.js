import React, { memo } from "react";
import { Text, View, StyleSheet, Pressable } from "react-native";
import { Marker } from "react-native-maps";
import { returnMarkerStyle } from "./helpers";

const ClusteredMarker = ({
  geometry,
  properties,
  onPress,
  clusterColor,
  clusterTextColor,
  clusterFontFamily,
  tracksViewChanges,
  index,
  isRenderCluster
}) => {
  const points = properties.point_count;
  const { width, height, fontSize, size } = React.useMemo(() => returnMarkerStyle(points), [points]);

  const view1Style = React.useMemo(() => [
    styles.wrapper,
    {
      backgroundColor: clusterColor,
      width,
      height,
      borderRadius: width / 2,
    },
  ], [clusterColor, width, height]);

  const view2Style = React.useMemo(() => [
    styles.cluster,
    {
      backgroundColor: clusterColor,
      width: size,
      height: size,
      borderRadius: size / 2,
    },
  ], [clusterColor, size]);

  const textStyle = React.useMemo(() => [
    styles.text,
    {
      color: clusterTextColor,
      fontSize,
      fontFamily: clusterFontFamily,
    },
  ], [clusterTextColor, clusterFontFamily, fontSize]);

  const pressableStyle = React.useMemo(() => [styles.container, { width, height, borderRadius: 45 }], [width, height,]);

  const markerStyle = React.useMemo(() => {return { zIndex: 100 }}, [points]);

  const location = React.useMemo(() => {return {longitude: geometry.coordinates[0], latitude: geometry.coordinates[1]}}, [geometry]);

  const markerPressHandler = React.useCallback((event) => {
    onPress(event);
  }, []);

  const markerId = React.useMemo(() => ("a" + geometry.coordinates[0].toString() + geometry.coordinates[1].toString()), []);

  return (
    <Marker
      key={`${geometry.coordinates[0]}_${geometry.coordinates[1]}`}
      coordinate={location}
      // style={markerStyle}
      onPress={onPress}
      tracksViewChanges={tracksViewChanges}
      index={index}
      identifier={markerId}
    >
      <Pressable
        activeOpacity={0.5}
        style={pressableStyle}
      >
        <View
          style={view1Style}
        />
        <View
          style={view2Style}
        >
          <Text
            style={textStyle}
          >
            {points}
          </Text>
        </View>
      </Pressable>
    </Marker>
  );
};

const styles = StyleSheet.create({
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  wrapper: {
    position: "absolute",
    opacity: 0.5,
    zIndex: 0,
  },
  cluster: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  text: {
    fontWeight: "bold",
  },
});

export default memo(ClusteredMarker);
