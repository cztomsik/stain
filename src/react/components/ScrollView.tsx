import * as React from 'react'
import { ScrollViewProps } from 'react-native'
import { View, StyleSheet } from '..';

// TODO
const ScrollView: React.SFC<ScrollViewProps> = (props) => {
  return (
    <View style={[styles.scrollView, props.style]}>
      <View style={props.contentContainerStyle}>
        {props.children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    overflow: 'scroll'
  }
})

export { ScrollView }
