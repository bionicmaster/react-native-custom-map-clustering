import React, {
  memo,
  useState,
  useEffect,
  useMemo,
  useRef,
  forwardRef,
} from "react";
import { Dimensions, LayoutAnimation, Platform } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import SuperCluster from "supercluster";
import ClusterMarker from "./ClusteredMarker";
import {
  isMarker,
  markerToGeoJSONFeature,
  calculateBBox,
  returnMapZoom,
  generateSpiral,
} from "./helpers";

const ClusteredMapView = forwardRef(
  (
    {
      radius,
      maxZoom,
      minZoom,
      minPoints,
      extent,
      nodeSize,
      children,
      onClusterPress,
      onRegionChangeComplete,
      onMarkersChange,
      preserveClusterPressBehavior,
      clusteringEnabled,
      clusterColor,
      clusterTextColor,
      clusterFontFamily,
      spiderLineColor,
      layoutAnimationConf,
      animationEnabled,
      renderCluster,
      tracksViewChanges,
      spiralEnabled,
      superClusterRef,
      clusterMarkersList,
      userMarkerPosition,
      onUserMarkerPressHandler,
      onUserMarkerDragEndHandler,
      isAllowEditUserMarker,
      poligonMarkers,
      ...restProps
    },
    ref
  ) => {
    const [markers, updateMarkers] = useState([]);
    const [spiderMarkers, updateSpiderMarker] = useState([]);
    const [otherChildren, updateChildren] = useState([]);
    const [superCluster, setSuperCluster] = useState(null);
    const [currentRegion, updateRegion] = useState(
      restProps.region || restProps.initialRegion
    );

    const [clusterSpiral, setClusterSpiral] = useState([]);

    const [isSpiderfier, updateSpiderfier] = useState(false);
    const [clusterChildren, updateClusterChildren] = useState(null);
    const mapRef = useRef();

    const propsChildren = useMemo(() => React.Children.toArray(children), [
      children,
    ]);

    useEffect(() => {
      const rawData = [];
      const otherChildren = [];

      if (!clusteringEnabled) {
        updateSpiderMarker([]);
        setClusterSpiral([]);
        updateMarkers([]);
        updateChildren(propsChildren);
        setSuperCluster(null);
        return;
      }

      propsChildren.forEach((child, index) => {
        // if (isMarker(child)) {
        //   rawData.push(markerToGeoJSONFeature(child, index));
        // } else {
        otherChildren.push(child);
        // }
      });

      const superCluster = new SuperCluster({
        radius,
        maxZoom,
        minZoom,
        minPoints,
        extent,
        nodeSize,
      });

      if (clusterMarkersList !== null && clusterMarkersList !== undefined && clusterMarkersList.length > 0) {
        clusterMarkersList.forEach((item, index) => {
          rawData.push(markerToGeoJSONFeature(item, index));
        });
      }

      superCluster.load(rawData);

      const bBox = calculateBBox(currentRegion);
      const zoom = returnMapZoom(currentRegion, bBox, minZoom);
      const markers = superCluster.getClusters(bBox, zoom);

      updateMarkers(markers);
      updateChildren(otherChildren);
      setSuperCluster(superCluster);

      superClusterRef.current = superCluster;
    }, [propsChildren, clusteringEnabled, clusterMarkersList]);

    useEffect(() => {
      if (!spiralEnabled) return;

      if (isSpiderfier && markers.length > 0) {
        let allSpiderMarkers = [];
        let spiralChildren = [];
        let isClusterSpiral = [];
        markers.map((marker, i) => {
          if (marker.properties.cluster) {
            spiralChildren = superCluster.getLeaves(
              marker.properties.cluster_id,
              Infinity
            );
          }
          let positions = generateSpiral(marker, spiralChildren, markers, i);
          allSpiderMarkers.push(...positions);
          if (positions != null && positions != undefined && positions.length > 0) {
            isClusterSpiral.push(i);
          }
          // console.log(JSON.stringify({marker, i, positions}))
        });
        setClusterSpiral(isClusterSpiral);
        updateSpiderMarker(allSpiderMarkers);
      } else {
        setClusterSpiral([]);
        updateSpiderMarker([]);
      }
    }, [isSpiderfier, markers]);

    const _onRegionChangeComplete = (region) => {
      if (superCluster && region) {
        const bBox = calculateBBox(region);
        const zoom = returnMapZoom(region, bBox, minZoom);
        const markers = superCluster.getClusters(bBox, zoom);
        if (animationEnabled && Platform.OS === "ios") {
          LayoutAnimation.configureNext(layoutAnimationConf);
        }
        if (zoom >= 18 && markers.length > 0 && clusterChildren) {
          if (spiralEnabled) updateSpiderfier(true);
        } else {
          if (spiralEnabled) updateSpiderfier(false);
        }
        updateMarkers(markers);
        onMarkersChange(markers);
        onRegionChangeComplete(region, markers);
        updateRegion(region);
      } else {
        onRegionChangeComplete(region);
      }
    };

    const _onClusterPress = React.useCallback((cluster) => () => {
      const children = superCluster.getLeaves(cluster.id, Infinity);
      updateClusterChildren(children);

      if (preserveClusterPressBehavior) {
        onClusterPress(cluster, children);
        return;
      }

      const coordinates = children.map(({ geometry }) => ({
        latitude: geometry.coordinates[1],
        longitude: geometry.coordinates[0],
      }));

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: restProps.edgePadding,
      });

      onClusterPress(cluster, children);
    }, [superCluster, onClusterPress, preserveClusterPressBehavior, onClusterPress, restProps]);

    const _onDefaultClusterPress = React.useCallback((event) => {
      const id = event.nativeEvent.id;
      const cluster = markers.find((item) => {
        const itemId = "a" + item.geometry.coordinates[0].toString() + item.geometry.coordinates[1].toString();
        // console.log({itemId, point_count: item.properties.point_count});
        if (itemId === id)
          return true;

        return false;
      });
      if (cluster === null || cluster === undefined) {
        // console.log("cluster doesn't exist", id);
        return;
      }
      // console.log("found cluster:", {id, point_count: cluster.properties.point_count});
      const children = superCluster.getLeaves(cluster.id, Infinity);
      updateClusterChildren(children);

      if (preserveClusterPressBehavior) {
        onClusterPress(cluster, children);
        return;
      }

      const coordinates = children.map(({ geometry }) => ({
        latitude: geometry.coordinates[1],
        longitude: geometry.coordinates[0],
      }));

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: restProps.edgePadding,
      });

      onClusterPress(cluster, children);
      event.stopPropagation();
    }, [superCluster, markers, onClusterPress, mapRef, preserveClusterPressBehavior]);

    const renderClusterMarkers = (marker) => {
      return markers.map((marker, index) =>
        marker.properties.point_count === 0 ? (
          clusterMarkersList[marker.properties.index]
        ) : (!isSpiderfier || (isSpiderfier == true && clusterSpiral.find((item) => item == index) === undefined) ? (
          renderCluster ? (
            renderCluster({
              onPress: _onClusterPress(marker),
              clusterColor,
              clusterTextColor,
              clusterFontFamily,
              ...marker,
            })
          ) : (
            <ClusterMarker
              key={`cluster-${marker.id}`}
              {...marker}
              onPress={_onDefaultClusterPress}
              clusterColor={
                restProps.selectedClusterId === marker.id
                  ? restProps.selectedClusterColor
                  : clusterColor
              }
              clusterTextColor={clusterTextColor}
              clusterFontFamily={clusterFontFamily}
              tracksViewChanges={tracksViewChanges}
              index={index}
              isRenderCluster={false}
            />
          )
        ) : null)
      )
    }

    return (
      <MapView
        {...restProps}
        ref={(map) => {
          mapRef.current = map;
          if (ref) ref.current = map;
          restProps.mapRef(map);
        }}
        onRegionChangeComplete={_onRegionChangeComplete}
      >
        {clusterMarkersList != null && clusterMarkersList != undefined ? renderClusterMarkers() : null}
        {otherChildren}
        {spiderMarkers.map((marker) => {
          return clusterMarkersList[marker.index]
            ? React.cloneElement(clusterMarkersList[marker.index], {
              coordinate: { ...marker },
            })
            : null;
        })}
        {spiderMarkers.map((marker, index) => (
          <Polyline
            key={index}
            coordinates={[marker.centerPoint, marker, marker.centerPoint]}
            strokeColor={spiderLineColor}
            strokeWidth={1}
          />
        ))}
        {userMarkerPosition != null && userMarkerPosition !== undefined ?
          <Marker
            coordinate={userMarkerPosition}
            onPress={onUserMarkerPressHandler}
            onDragEnd={onUserMarkerDragEndHandler}
          /> : null}
        {poligonMarkers}
      </MapView>
    );
  }
);

ClusteredMapView.defaultProps = {
  clusteringEnabled: true,
  spiralEnabled: true,
  animationEnabled: true,
  preserveClusterPressBehavior: false,
  layoutAnimationConf: LayoutAnimation.Presets.spring,
  tracksViewChanges: false,
  // SuperCluster parameters
  radius: Dimensions.get("window").width * 0.06,
  maxZoom: 18,
  minZoom: 1,
  minPoints: 2,
  extent: 512,
  nodeSize: 32,
  // Map parameters
  edgePadding: { top: 50, left: 50, right: 50, bottom: 50 },
  // Cluster styles
  clusterColor: "#00B386",
  clusterTextColor: "#FFFFFF",
  spiderLineColor: "#FF0000",
  // Callbacks
  onRegionChangeComplete: () => { },
  onClusterPress: () => { },
  onMarkersChange: () => { },
  superClusterRef: {},
  mapRef: () => { },
};

export default memo(ClusteredMapView);
